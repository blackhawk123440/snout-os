# Render Deployment Instructions - Step by Step

## Prerequisites

- Render account with access to `blackhawk123440/snout-os` repo
- GitHub repo connected to Render

## Step 1: Render Service Inventory

**Please provide the following for each Render service connected to `blackhawk123440/snout-os`:**

For each service, provide:
- **Service name**
- **Type** (Web Service / Background Worker / Database / Redis)
- **Root directory**
- **Build command**
- **Start command**
- **Public URL** (if applicable)

**Expected services:**
1. `snout-os-web` (Next.js) - Should exist
2. `snout-os-api` (NestJS) - Needs creation
3. `snout-os-worker` (BullMQ) - Needs creation
4. `snout-os-db` (PostgreSQL) - May exist
5. `snout-os-redis` (Redis) - May exist

---

## Step 2: Create API Service

### If `snout-os-api` does NOT exist:

1. **Go to Render Dashboard** → Click "New +" → Select "Web Service"
2. **Connect Repository:**
   - Select: `blackhawk123440/snout-os`
   - Branch: `main` (or your deployment branch)
3. **Configure Service:**
   - **Name:** `snout-os-api`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api start:prod`
   - **Health Check Path:** `/health`
4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<from existing PostgreSQL service or create new>
   REDIS_URL=<from existing Redis service or create new>
   JWT_SECRET=<generate: openssl rand -base64 48> (SAVE THIS - needed for Web service)
   ENCRYPTION_KEY=<generate: openssl rand -base64 32>
   CORS_ORIGINS=https://snout-os-staging.onrender.com
   PROVIDER_MODE=mock
   ```
5. **Click "Create Web Service"**
6. **Wait for deployment to complete**
7. **Verify:** 
   ```bash
   curl https://snout-os-api.onrender.com/health
   # Should return: {"status":"ok","timestamp":"...","service":"snout-os-api"}
   ```

**Output:** `API_PUBLIC_URL = https://snout-os-api.onrender.com`

### If `snout-os-api` exists but is misconfigured:

1. Go to service → **Settings**
2. Update:
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api start:prod`
   - **Health Check Path:** `/health`
3. **Save Changes** (triggers redeploy)

---

## Step 3: Create Worker Service

### If `snout-os-worker` does NOT exist:

1. **Go to Render Dashboard** → Click "New +" → Select "Background Worker"
2. **Connect Repository:**
   - Select: `blackhawk123440/snout-os`
   - Branch: `main` (or your deployment branch)
3. **Configure Service:**
   - **Name:** `snout-os-worker`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api worker:prod`
4. **Environment Variables** (same as API service):
   ```
   NODE_ENV=production
   DATABASE_URL=<same as API service>
   REDIS_URL=<same as API service>
   JWT_SECRET=<same as API service>
   ```
5. **Click "Create Background Worker"**
6. **Wait for deployment to complete**
7. **Verify:** Check logs for "🚀 Workers started: Message Retry Worker, Automation Worker"

**Output:** `WORKER_SERVICE_NAME = snout-os-worker`

### If `snout-os-worker` exists but is misconfigured:

1. Go to service → **Settings**
2. Update:
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api worker:prod`
3. **Save Changes** (triggers redeploy)

---

## Step 4: Wire Web → API

1. **Go to `snout-os-web` service** → **Environment** tab
2. **Set/Update Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
   NEXTAUTH_URL=https://snout-os-staging.onrender.com
   NEXTAUTH_SECRET=<64+ chars - existing value or generate new>
   JWT_SECRET=<SAME VALUE AS API SERVICE - CRITICAL>
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   ```
   **IMPORTANT:** `JWT_SECRET` must match the API service's `JWT_SECRET` exactly.
3. **Click "Save Changes"** (triggers redeploy)
4. **Wait for deployment to complete**

---

## Step 5: Verify Shadow Backend Removed ✅

**This step is already complete in code.** All Next.js API routes have been converted to proxies.

**Verify:**
```bash
# Should return 404, 503, or 401 (not 200 with data)
curl -I https://snout-os-staging.onrender.com/api/messages/threads

# Should return 200 (health) or 401/403 (requires auth)
curl -I https://snout-os-api.onrender.com/api/messages/threads
```

---

## Step 6: Generate Proof Pack

**Run:**
```bash
WEB_PUBLIC_URL=https://snout-os-staging.onrender.com \
API_PUBLIC_URL=https://snout-os-api.onrender.com \
OWNER_EMAIL=owner@example.com \
OWNER_PASSWORD=password123 \
pnpm proof:deployment
```

**Or:**
```bash
pnpm proof:deployment
# (uses defaults, set env vars if different)
```

**Output:**
- `proof-pack-deployment/PROOF_PACK.md` - Summary
- `proof-pack-deployment/screenshots/` - Screenshots
- `proof-pack-deployment/har/` - HAR files
- `proof-pack-deployment/curl-output-*.txt` - Curl outputs

---

## Required Output

Please provide:

1. **Service Inventory:**
   ```
   WEB_PUBLIC_URL=https://snout-os-staging.onrender.com
   API_PUBLIC_URL=https://snout-os-api.onrender.com
   WORKER_SERVICE_NAME=snout-os-worker
   ```

2. **Screenshots:**
   - Render Web service env vars (redact secrets, show NEXT_PUBLIC_API_URL and JWT_SECRET are set)
   - Render API service env vars (redact secrets, show DATABASE_URL, REDIS_URL, JWT_SECRET are set)
   - Render Worker service env vars (redact secrets, show DATABASE_URL, REDIS_URL, JWT_SECRET are set)

3. **Proof Pack:**
   - Run `pnpm proof:deployment` and provide the generated `proof-pack-deployment/` folder

4. **Worker Evidence:**
   - Screenshot of Render Worker logs showing "🚀 Workers started"
   - Screenshot of Audit/Alerts showing at least 1 job execution (retry, automation, or pool-release)

---

## Troubleshooting

### API Health Check Fails

- Verify Root Directory is `enterprise-messaging-dashboard`
- Verify Build Command includes `pnpm --filter @snoutos/shared build`
- Check build logs for errors
- Verify `/health` endpoint exists in `apps/api/src/health.controller.ts`

### Web App Still Uses Shadow Routes

- Verify `NEXT_PUBLIC_API_URL` is set in Web service env vars
- Verify `JWT_SECRET` matches API service
- Check browser Network tab - requests should go to `API_PUBLIC_URL`, not `WEB_PUBLIC_URL/api/*`
- Redeploy Web service after setting env vars

### Worker Not Starting

- Verify Root Directory is `enterprise-messaging-dashboard`
- Verify Start Command is `pnpm --filter @snoutos/api worker:prod`
- Check logs for errors
- Verify `DATABASE_URL` and `REDIS_URL` are set correctly

### Authentication Fails

- Verify `JWT_SECRET` is the same in Web and API services
- Verify `NEXTAUTH_SECRET` is set in Web service
- Check API logs for JWT verification errors
