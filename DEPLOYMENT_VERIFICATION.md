# Deployment Verification - Evidence Only

## Step 1: Render Service Inventory

**Action:** Go to https://dashboard.render.com → Services → Filter by repo: `blackhawk123440/snout-os`

**For each service, provide:**
1. Service name
2. Type (Web Service / Background Worker)
3. Root Directory
4. Build Command
5. Start Command
6. Public URL

**Expected Services:**
- `snout-os-web` or `snout-os-staging` (Next.js)
- `snout-os-api` (NestJS)
- `snout-os-worker` (BullMQ)

---

## Step 2: Verify API Health

**Command:**
```bash
curl -i https://<API_PUBLIC_URL>/health
```

**Expected Output:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok","timestamp":"...","service":"snout-os-api"}
```

**If 404:**
- Check API service Root Directory = `enterprise-messaging-dashboard`
- Check API service Start Command = `pnpm --filter @snoutos/api start:prod`
- Verify service exists and is deployed

**Evidence Required:** Full `curl -i` output

---

## Step 3: Fix NextAuth Environment Variables

**Web Service → Environment → Set:**
```
NEXTAUTH_URL=https://<WEB_PUBLIC_URL>
```
(Must be full https URL, not host-only. Example: `https://snout-os-staging.onrender.com`)

**Verify:**
```bash
curl https://<WEB_PUBLIC_URL>/api/auth/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "env": {
    "NEXTAUTH_URL_RAW": "https://<WEB_PUBLIC_URL>",
    "NEXTAUTH_SECRET_PRESENT": true,
    "NEXTAUTH_SECRET_VALID": true,
    "NEXT_PUBLIC_API_URL": "https://<API_PUBLIC_URL>"
  }
}
```

**Evidence Required:** JSON response showing `NEXTAUTH_URL_RAW` matches web service URL

---

## Step 4: Fix Frontend API Wiring

**Web Service → Environment → Set:**
```
NEXT_PUBLIC_API_URL=https://<API_PUBLIC_URL>
```
(Must be full https URL. Example: `https://snout-os-api.onrender.com`)

**Verify:**
1. Open browser → DevTools → Network tab
2. Navigate to: `https://<WEB_PUBLIC_URL>/messages`
3. Find request: `GET /api/messages/threads`
4. Check Request URL column
5. **Must be:** `https://<API_PUBLIC_URL>/api/messages/threads`
6. **Must NOT be:** `https://<WEB_PUBLIC_URL>/api/messages/threads`

**Evidence Required:** Network tab screenshot showing threads request URL

---

## Step 5: Fix Render Web Health Check

**Web Service → Settings → Health Check Path**

**If `/api/health` returns 404:**
- Change Health Check Path to: `/api/auth/health`
- Save (triggers redeploy)

**Verify:**
```bash
curl https://<WEB_PUBLIC_URL>/api/auth/health
```

**Expected:** 200 OK

**Evidence Required:** Render dashboard showing service healthy (green status)

---

## Summary Checklist

- [ ] Service inventory provided (all services with exact configs)
- [ ] API health returns 200: `curl -i https://<API_PUBLIC_URL>/health`
- [ ] NextAuth URL correct: `/api/auth/health` shows `NEXTAUTH_URL_RAW: https://<WEB_PUBLIC_URL>`
- [ ] Frontend calls API: Network tab shows `/messages` requests go to `https://<API_PUBLIC_URL>`
- [ ] Health check works: Render dashboard shows service healthy

---

## Environment Variables Summary

### Web Service (`snout-os-web` or `snout-os-staging`)
```
NEXTAUTH_URL=https://<WEB_PUBLIC_URL>
NEXT_PUBLIC_API_URL=https://<API_PUBLIC_URL>
NEXTAUTH_SECRET=<your-secret>
DATABASE_URL=<same-as-api>
```

### API Service (`snout-os-api`)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=<your-database-url>
REDIS_URL=<your-redis-url>
JWT_SECRET=<your-jwt-secret>
CORS_ORIGINS=https://<WEB_PUBLIC_URL>
```

---

## No Product Logic Changes

This document is for deployment verification only. No code changes, no features, no UI redesigns.
