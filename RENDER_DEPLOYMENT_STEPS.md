# Render Deployment Steps - Canonical Architecture

## Required Services

1. **snout-os-web** (Next.js UI) - `https://snout-os-staging.onrender.com` ✅
2. **snout-os-api** (NestJS Backend) - `https://snout-os-api.onrender.com` ❓
3. **snout-os-worker** (BullMQ Workers) - Background worker

## Step 1: Render Service Inventory

**Please provide current Render services for repo `blackhawk123440/snout-os`:**

For each service:
- Service name
- Type (Web Service / Background Worker)
- Root directory
- Build command
- Start command
- Public URL

See `RENDER_SERVICE_INVENTORY.md` for template.

## Step 2: Create/Verify API Service

### If `snout-os-api` does NOT exist:

1. Go to Render Dashboard → New + → Web Service
2. Connect repo: `blackhawk123440/snout-os`
3. Configure:
   - **Name:** `snout-os-api`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api start:prod`
   - **Health Check Path:** `/health`

4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<from snout-os-db>
   REDIS_URL=<from snout-os-redis>
   JWT_SECRET=<generate 64+ chars>
   CORS_ORIGINS=https://snout-os-staging.onrender.com
   PROVIDER_MODE=mock
   ```

5. Verify: `GET https://snout-os-api.onrender.com/health` → 200

### If `snout-os-api` exists but wrong config:

1. Go to service → Settings
2. Update Root Directory to: `enterprise-messaging-dashboard`
3. Update Build Command: `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
4. Update Start Command: `pnpm --filter @snoutos/api start:prod`
5. Save Changes (triggers redeploy)

## Step 3: Create/Verify Worker Service

### If `snout-os-worker` does NOT exist:

1. Go to Render Dashboard → New + → Background Worker
2. Connect repo: `blackhawk123440/snout-os`
3. Configure:
   - **Name:** `snout-os-worker`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api worker:prod`

4. Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<same as API>
   REDIS_URL=<same as API>
   JWT_SECRET=<same as API>
   ```

### If `snout-os-worker` exists but wrong config:

1. Go to service → Settings
2. Update Root Directory to: `enterprise-messaging-dashboard`
3. Update Build Command: `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
4. Update Start Command: `pnpm --filter @snoutos/api worker:prod`
5. Save Changes (triggers redeploy)

## Step 4: Wire Web → API

1. Go to `snout-os-web` service → Environment
2. Set/Update:
   ```
   NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
   NEXTAUTH_URL=https://snout-os-staging.onrender.com
   NEXTAUTH_SECRET=<64+ chars>
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   ```
3. Save Changes (triggers redeploy)

## Step 5: Remove/Disable Next.js Shadow API Routes

The Next.js routes in `src/app/api/**` that duplicate NestJS endpoints must be:
- **Removed** (if not needed)
- **OR changed to strict proxies** to `{API_PUBLIC_URL}`

### Routes to Remove/Proxy:

- `src/app/api/messages/threads/route.ts` → Proxy to `{API_PUBLIC_URL}/api/threads`
- `src/app/api/messages/send/route.ts` → Proxy to `{API_PUBLIC_URL}/api/messaging/send`
- `src/app/api/numbers/route.ts` → Proxy to `{API_PUBLIC_URL}/api/numbers`
- `src/app/api/assignments/windows/route.ts` → Proxy to `{API_PUBLIC_URL}/api/assignments/windows`

## Step 6: Verify End-to-End

### Acceptance Criteria:

1. **Browser Network Tab:**
   - `/messages` loads threads from `{API_PUBLIC_URL}/api/threads`
   - NOT from `{WEB_PUBLIC_URL}/api/messages/threads`

2. **API Health:**
   - `GET {API_PUBLIC_URL}/health` → 200 (no auth required)

3. **API Endpoints:**
   - `GET {API_PUBLIC_URL}/api/messages/threads` → 200 (with auth)
   - `GET {API_PUBLIC_URL}/api/numbers` → 200 (with auth)
   - `GET {API_PUBLIC_URL}/api/assignments/windows` → 200 (with auth)

4. **Worker Running:**
   - Check Render logs for `snout-os-worker`
   - Should see: "🚀 Workers started: Message Retry Worker, Automation Worker"
   - Verify retries + automations + pool release execute (check Audit/Alerts)

## Files Created/Modified

1. ✅ `enterprise-messaging-dashboard/apps/api/src/health.controller.ts` - Public health endpoint
2. ✅ `enterprise-messaging-dashboard/apps/api/src/app.module.ts` - Added HealthController
3. ✅ `enterprise-messaging-dashboard/apps/api/src/worker.ts` - Worker entry point
4. ✅ `enterprise-messaging-dashboard/apps/api/package.json` - Added worker scripts
5. ✅ `render.yaml` - Main repo Render blueprint
6. ✅ `RENDER_SERVICE_INVENTORY.md` - Service inventory template
7. ✅ `RENDER_DEPLOYMENT_STEPS.md` - This file

## Next Steps

1. Provide Render service inventory (Step 1)
2. Create/verify API service (Step 2)
3. Create/verify Worker service (Step 3)
4. Wire Web → API (Step 4)
5. Remove/disable shadow API routes (Step 5)
6. Verify end-to-end (Step 6)
