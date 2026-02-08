# Complete Setup Guide

This guide walks you through deploying all three services (Web, API, Worker) to Render.

## Prerequisites

Before starting, you need:
1. **PostgreSQL Database** - Create a PostgreSQL service in Render (or use existing)
2. **Redis** - Create a Redis service in Render (or use existing)
3. **GitHub Repository** - `blackhawk123440/snout-os` must be connected to Render

---

## Step 1: Generate Secrets

First, generate the secrets you'll need:

```bash
# Generate JWT_SECRET (for API and Worker)
openssl rand -base64 48

# Generate ENCRYPTION_KEY (for API)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET (for Web - must be 64+ characters)
openssl rand -base64 64
```

**Save these values** - you'll need them in the next steps.

---

## Step 2: Create PostgreSQL Database (if needed)

1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Name it: `snout-os-db` (or use existing)
4. Note the **Internal Database URL** (starts with `postgresql://`)
5. Wait for database to be ready

---

## Step 3: Create Redis (if needed)

1. Go to https://dashboard.render.com
2. Click "New +" → "Redis"
3. Name it: `snout-os-redis` (or use existing)
4. Note the **Internal Redis URL** (starts with `redis://`)
5. Wait for Redis to be ready

---

## Step 4: Create snout-os-api Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect repository: `blackhawk123440/snout-os`
4. Branch: `main`
5. Configure:
   - **Name:** `snout-os-api`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && cd apps/api && pnpm prisma generate && cd ../.. && pnpm rebuild --filter @snoutos/api && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api start:prod`
   - **Health Check Path:** `/health`
6. Click "Create Web Service"
7. Go to service → "Environment" tab
8. Add these environment variables:

```
NODE_ENV = production
PORT = 3001
DATABASE_URL = <from Step 2 - Internal Database URL>
REDIS_URL = <from Step 3 - Internal Redis URL>
JWT_SECRET = <from Step 1>
ENCRYPTION_KEY = <from Step 1>
CORS_ORIGINS = https://snout-os-staging.onrender.com
PROVIDER_MODE = mock
```

9. Click "Save Changes"
10. Wait for deployment to complete (5-10 minutes)
11. Note the public URL (e.g., `https://snout-os-api.onrender.com`)
12. Verify: `curl https://snout-os-api.onrender.com/health` → should return `{"status":"ok",...}`

**✅ Output:** `API_PUBLIC_URL=https://snout-os-api.onrender.com`

---

## Step 5: Create snout-os-worker Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Background Worker"
3. Connect repository: `blackhawk123440/snout-os`
4. Branch: `main`
5. Configure:
   - **Name:** `snout-os-worker`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && cd apps/api && pnpm prisma generate && cd ../.. && pnpm rebuild --filter @snoutos/api && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api worker:prod`
6. Click "Create Background Worker"
7. Go to service → "Environment" tab
8. Add these environment variables (use **SAME** values as API):

```
NODE_ENV = production
DATABASE_URL = <same as snout-os-api>
REDIS_URL = <same as snout-os-api>
JWT_SECRET = <same as snout-os-api>
```

9. Click "Save Changes"
10. Wait for deployment to complete
11. Go to service → "Logs" tab
12. Verify logs show: `🚀 Workers started: Message Retry Worker, Automation Worker`

**✅ Output:** `WORKER_SERVICE_NAME=snout-os-worker`

---

## Step 6: Update snout-os-web Service

1. Go to https://dashboard.render.com
2. Find your existing web service (`snout-os-web` or `snout-os-staging`)
3. Go to "Environment" tab
4. Add/Update these environment variables:

```
NEXT_PUBLIC_API_URL = https://snout-os-api.onrender.com
NEXTAUTH_URL = https://snout-os-staging.onrender.com
NEXTAUTH_SECRET = <from Step 1>
NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true
```

**⚠️ CRITICAL:** Do NOT set `JWT_SECRET` on Web service. Web uses `NEXTAUTH_SECRET`; API/Worker use `JWT_SECRET`.

5. Click "Save Changes" (triggers redeploy)
6. Wait for deployment to complete

**✅ Output:** `WEB_PUBLIC_URL=https://snout-os-staging.onrender.com`

---

## Step 7: Run Database Migrations and Seed

The API service needs database migrations and seed data for testing.

**Run migrations and seed:**
1. Go to `snout-os-api` service → "Shell" tab (or use Render's Shell feature)
2. Run these commands:
```bash
cd /opt/render/project/src/enterprise-messaging-dashboard
pnpm --filter @snoutos/api db:migrate:deploy
pnpm --filter @snoutos/api db:seed
```

**Note:** Use `db:migrate:deploy` (not `db:migrate`) for production. This applies existing migrations without creating a shadow database.

**Or add to build command (automatic):**
Update API build command to:
```
pnpm install && pnpm --filter @snoutos/shared build && cd apps/api && pnpm prisma generate && cd ../.. && pnpm --filter @snoutos/api build && cd apps/api && pnpm db:migrate deploy && pnpm db:seed && cd ../..
```

**Test user credentials (after seeding):**
- Email: `owner@example.com`
- Password: `password123`

---

## Step 8: Verify Everything Works

### 8.1 API Health Check

```bash
curl https://snout-os-api.onrender.com/health
```

**Expected:** `{"status":"ok","timestamp":"...","service":"snout-os-api"}`

### 8.2 CORS Check

```bash
curl -H "Origin: https://snout-os-staging.onrender.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -X OPTIONS \
  https://snout-os-api.onrender.com/api/messages/threads
```

**Expected:** Response includes `Access-Control-Allow-Origin: https://snout-os-staging.onrender.com`

### 8.3 Web Login

1. Go to `https://snout-os-staging.onrender.com/login`
2. Login with test credentials (if seeded) or create account
3. Should redirect to `/dashboard`

### 8.4 Network Verification

1. Open `https://snout-os-staging.onrender.com/messages` in browser
2. Open DevTools → Network tab
3. Look for requests to `snout-os-api.onrender.com/api/...`
4. **Must NOT** see requests to `snout-os-staging.onrender.com/api/...`

---

## Step 9: Generate Proof Pack

Once everything is working, generate the proof pack:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
API_PUBLIC_URL=https://snout-os-api.onrender.com \
WEB_PUBLIC_URL=https://snout-os-staging.onrender.com \
JWT_SECRET=<same value as API service> \
OWNER_EMAIL=owner@example.com \
OWNER_PASSWORD=password123 \
pnpm proof:deployment
```

This will generate a `proof-pack/` folder with all verification evidence.

---

## Troubleshooting

### API returns 404
- Check service name matches exactly: `snout-os-api`
- Verify build completed successfully
- Check logs for errors

### CORS errors in browser
- Verify `CORS_ORIGINS` includes your web URL
- Check API service logs for CORS errors
- Ensure web URL matches exactly (no trailing slash)

### Login fails
- Check `NEXTAUTH_URL` matches web service URL exactly
- Verify `NEXTAUTH_SECRET` is set (64+ characters)
- Check web service logs for NextAuth errors

### Worker not starting
- Verify `DATABASE_URL` and `REDIS_URL` are correct
- Check worker logs for connection errors
- Ensure `JWT_SECRET` matches API service

### Database connection errors
- Use **Internal Database URL** (not public URL)
- Verify database is running
- Check `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`

---

## Quick Reference

**Service URLs:**
- Web: `https://snout-os-staging.onrender.com`
- API: `https://snout-os-api.onrender.com`
- Worker: (no public URL - background service)

**Environment Variables Summary:**

| Service | Required Env Vars |
|---------|------------------|
| **API** | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGINS` |
| **Worker** | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (same as API) |
| **Web** | `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` |

**Important:**
- API and Worker share `JWT_SECRET` (must match)
- Web uses `NEXTAUTH_SECRET` (different from `JWT_SECRET`)
- All services need `DATABASE_URL` and `REDIS_URL`

---

## Next Steps

After setup is complete:
1. Run proof pack verification
2. Test all features (login, messages, numbers, assignments)
3. Verify worker jobs execute (check audit events)
4. Monitor logs for any errors

For detailed verification steps, see `DEPLOYMENT_RUNBOOK.md`.
