# Deployment Runbook - Canonical Architecture

## Step 1: Create snout-os-api Service in Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect repository: `blackhawk123440/snout-os`
4. Branch: `main`
5. Configure:
   - **Name:** `snout-os-api`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && cd apps/api && pnpm prisma generate && cd ../.. && (cd node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt && npm rebuild 2>&1 || pnpm rebuild bcrypt 2>&1 || echo 'bcrypt rebuild skipped') && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api start:prod`
   - **Health Check Path:** `/health`
6. Click "Create Web Service"
7. Go to service → "Environment" tab
8. Add these environment variables (click "Add Environment Variable" for each):

```
NODE_ENV = production
PORT = 3001
DATABASE_URL = <copy from existing PostgreSQL service or create new>
REDIS_URL = <copy from existing Redis service or create new>
JWT_SECRET = <generate: openssl rand -base64 48>
ENCRYPTION_KEY = <generate: openssl rand -base64 32>
CORS_ORIGINS = https://snout-os-staging.onrender.com
PROVIDER_MODE = mock
```

9. Wait for deployment to complete
10. Go to service → "Shell" tab (or use SSH)
11. Run database migrations:
    ```bash
    cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
    pnpm prisma migrate deploy
    ```
    **If `prisma migrate deploy` fails**, apply SQL directly:
    ```bash
    psql $DATABASE_URL < prisma/migrations/20260128000000_init_messaging_schema/migration.sql
    psql $DATABASE_URL < prisma/migrations/20260119000000_add_performance_indexes/migration.sql
    ```
12. Run database seed:
    ```bash
    pnpm db:seed
    ```
13. Note the public URL: `https://snout-os-api.onrender.com` (or similar)
14. Verify: `curl https://snout-os-api.onrender.com/health` → should return `{"status":"ok",...}`

**Output:** `API_PUBLIC_URL=https://snout-os-api.onrender.com`

---

## Step 2: Create snout-os-worker Service in Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Background Worker"
3. Connect repository: `blackhawk123440/snout-os`
4. Branch: `main`
5. Configure:
   - **Name:** `snout-os-worker`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && cd apps/api && pnpm prisma generate && cd ../.. && (cd node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt && npm rebuild 2>&1 || pnpm rebuild bcrypt 2>&1 || echo 'bcrypt rebuild skipped') && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api worker:prod`
6. Click "Create Background Worker"
7. Go to service → "Environment" tab
8. Add these environment variables (use SAME values as API service):

```
NODE_ENV = production
DATABASE_URL = <same as snout-os-api>
REDIS_URL = <same as snout-os-api>
JWT_SECRET = <same as snout-os-api>
```

9. Wait for deployment to complete
10. Go to service → "Logs" tab
11. Verify logs show: `🚀 Workers started: Message Retry Worker, Automation Worker`

**Output:** `WORKER_SERVICE_NAME=snout-os-worker`

---

## Step 3: Update snout-os-web Service Build Command and Environment Variables

1. Go to https://dashboard.render.com
2. Click on `snout-os-web` service (or `snout-os-staging` if that's the name)
3. Go to "Settings" tab
4. Update **Build Command** to:
   ```
   prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
   ```
   **Why:** Web service must use API's Prisma schema to match database structure.
5. Go to "Environment" tab
6. Click "Add Environment Variable" for each:

```
DATABASE_URL = <same as snout-os-api - REQUIRED for NextAuth>
NEXT_PUBLIC_API_URL = https://snout-os-api.onrender.com
NEXTAUTH_URL = https://snout-os-staging.onrender.com
NEXTAUTH_SECRET = <existing value or generate new 64+ chars>
NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true
```

**CRITICAL:** 
- Do NOT set JWT_SECRET on Web service. Web uses NEXTAUTH_SECRET; API/Worker use JWT_SECRET.
- DATABASE_URL is REQUIRED on Web service for NextAuth to query users.

5. Click "Save Changes" (triggers redeploy)
6. Wait for deployment to complete

**Output:** `WEB_PUBLIC_URL=https://snout-os-staging.onrender.com`

---

## Step 4: Verify API Health and CORS

Run:
```bash
curl https://snout-os-api.onrender.com/health
```

**Expected:** `{"status":"ok","timestamp":"...","service":"snout-os-api"}`

**If fails:** Check API service logs, verify build succeeded, verify `/health` endpoint exists.

Verify CORS is configured:
```bash
curl -H "Origin: https://snout-os-staging.onrender.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -X OPTIONS \
  https://snout-os-api.onrender.com/api/messages/threads
```

**Expected:** Response includes `Access-Control-Allow-Origin: https://snout-os-staging.onrender.com`

**If fails:** Check API service env var `CORS_ORIGINS` is set to `https://snout-os-staging.onrender.com`

---

## Step 5: Generate Proof Pack

Run:
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
API_PUBLIC_URL=https://snout-os-api.onrender.com \
WEB_PUBLIC_URL=https://snout-os-staging.onrender.com \
JWT_SECRET=<same value as snout-os-api service> \
OWNER_EMAIL=owner@example.com \
OWNER_PASSWORD=password123 \
pnpm proof:deployment
```

**Note:** `JWT_SECRET` is required to generate API tokens for direct NestJS API calls. Use the same value as set on the `snout-os-api` service.

**Expected output:**
```
🔍 Generating Deployment Proof Pack

Web: https://snout-os-staging.onrender.com
API: https://snout-os-api.onrender.com

📸 PROOF 1: API Health Check...
✅ API health: 200

📸 PROOF 2: CORS Verification...
✅ CORS: https://snout-os-staging.onrender.com

📸 PROOF 3: Web Shadow Route Check...
✅ Web shadow route: 401 (acceptable)

📸 PROOF 4: Browser Network Tab (HAR)...
✅ Network HAR: X API requests found, 0 shadow requests

📸 PROOF 5: /ops/proof Page...
✅ /ops/proof screenshot captured

📸 PROOF 6: Worker Evidence (Trigger Retry Job)...
✅ Worker evidence: NEW retry event triggered

✅ Proof pack generated: proof-pack
```

---

## Step 6: Verify Proof Pack Contents

Check `proof-pack/` folder contains:

1. **curl-health.txt** - Should show `Status: 200` and `{"status":"ok",...}`
2. **curl-cors.txt** - Should show `Access-Control-Allow-Origin: https://snout-os-staging.onrender.com`
3. **curl-web-shadow.txt** - Should show `Status: 401` or `503` (NOT `200` with data)
4. **network.har** - Open in browser DevTools → Network → Import HAR. Verify requests go to `snout-os-api.onrender.com`, NOT `snout-os-staging.onrender.com/api/*`
5. **network-analysis.txt** - Shows API requests count and shadow requests count (should be 0)
6. **screenshots/ops-proof.png** - Should show API base URL = `https://snout-os-api.onrender.com` and all tests PASS
7. **worker-proof.txt** - Should contain actual audit event from retry job execution (NOT just "workers started")

---

## Step 7: Worker Proof (Manual if Needed)

If `worker-proof.txt` shows no events:

1. Go to Render → `snout-os-worker` → "Logs"
2. Screenshot showing: `🚀 Workers started: Message Retry Worker, Automation Worker`
3. Save screenshot as `proof-pack/worker-logs.png`
4. Or trigger a retry/automation job and check audit events:
   - Go to `/messages` in browser
   - Find a failed message
   - Click "Retry"
   - Check `/audit` page for retry event
   - Screenshot audit event showing worker execution

---

## PASS/FAIL Criteria

### ✅ PASS Requirements:

1. **API Health:** `curl-health.txt` shows `Status: 200` and `{"status":"ok"}`
2. **CORS:** `curl-cors.txt` shows `Access-Control-Allow-Origin: https://snout-os-staging.onrender.com`
3. **Web Shadow Route:** `curl-web-shadow.txt` shows `Status: 401` or `503` (NOT `200` with data)
4. **Network HAR:** `network.har` contains requests to `snout-os-api.onrender.com/api/...` (host is API, NOT `snout-os-staging.onrender.com/api/...`)
5. **Proof Page:** `screenshots/ops-proof.png` shows API base URL = `https://snout-os-api.onrender.com` and tests PASS
6. **Worker:** `worker-proof.txt` contains actual audit event from retry/automation/pool release job execution (NOT just "workers started")

### ❌ FAIL If:

- API health returns anything other than 200
- CORS preflight fails or doesn't include correct `Access-Control-Allow-Origin`
- Web shadow route returns 200 with data (means backend logic still in Next.js)
- Network HAR shows requests to `WEB_PUBLIC_URL/api/*` instead of `API_PUBLIC_URL/api/*` (host must be API, not WEB)
- Proof page shows API base URL is NOT set or is wrong
- Worker proof only shows "workers started" without actual job execution evidence

---

## Final Outputs Required

After completing all steps, provide:

```
WEB_PUBLIC_URL=https://snout-os-staging.onrender.com
API_PUBLIC_URL=https://snout-os-api.onrender.com
WORKER_SERVICE_NAME=snout-os-worker
COMMIT_SHA_DEPLOYED=d5d99fe182789757d81f2f97661293d481b3ba51
```

Plus:
- Screenshot of Render Web service env vars (redact secrets, show NEXT_PUBLIC_API_URL and JWT_SECRET are set)
- Screenshot of Render API service env vars (redact secrets, show DATABASE_URL, REDIS_URL, JWT_SECRET are set)
- Screenshot of Render Worker service env vars (redact secrets, show DATABASE_URL, REDIS_URL, JWT_SECRET are set)
- `proof-pack/` folder contents
