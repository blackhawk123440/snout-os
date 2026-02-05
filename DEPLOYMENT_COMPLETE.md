# Deployment Completion Checklist

## Step 1: Render Service Inventory

**Run:** `pnpm get-render-inventory`

**Or manually collect from Render Dashboard:**
- Go to https://dashboard.render.com
- Select repo: blackhawk123440/snout-os
- For each service, note: name, type, rootDir, buildCmd, startCmd, public URL

**Required services:**
1. `snout-os-web` (Next.js) - ✅ exists
2. `snout-os-api` (NestJS) - ❓ needs creation/verification
3. `snout-os-worker` (BullMQ) - ❓ needs creation/verification

## Step 2: Create API Service

**If `snout-os-api` does NOT exist:**

1. Render Dashboard → New + → Web Service
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
   DATABASE_URL=<from snout-os-db or existing>
   REDIS_URL=<from snout-os-redis or existing>
   JWT_SECRET=<generate: openssl rand -base64 48> (SAVE THIS - needed for Web service too)
   ENCRYPTION_KEY=<generate: openssl rand -base64 32>
   CORS_ORIGINS=https://snout-os-staging.onrender.com
   PROVIDER_MODE=mock
   ```

5. **Verify:** `curl https://snout-os-api.onrender.com/health` → 200

**Output:** `API_PUBLIC_URL = https://snout-os-api.onrender.com`

## Step 3: Create Worker Service

**If `snout-os-worker` does NOT exist:**

1. Render Dashboard → New + → Background Worker
2. Connect repo: `blackhawk123440/snout-os`
3. Configure:
   - **Name:** `snout-os-worker`
   - **Root Directory:** `enterprise-messaging-dashboard`
   - **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
   - **Start Command:** `pnpm --filter @snoutos/api worker:prod`

4. Environment Variables (same as API):
   ```
   NODE_ENV=production
   DATABASE_URL=<same as API>
   REDIS_URL=<same as API>
   JWT_SECRET=<same as API>
   ```

5. **Verify:** Check logs for "🚀 Workers started: Message Retry Worker, Automation Worker"

## Step 4: Wire Web → API

1. Go to `snout-os-web` service → Environment tab
2. Set/Update:
   ```
   NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
   NEXTAUTH_URL=https://snout-os-staging.onrender.com
   NEXTAUTH_SECRET=<64+ chars>
   JWT_SECRET=<SAME VALUE AS API SERVICE>
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   ```
   **IMPORTANT:** `JWT_SECRET` must match the API service's `JWT_SECRET` for proxy auth to work.
3. **Save Changes** (triggers redeploy)

## Step 5: Shadow Backend Removed ✅

**Completed:** All shadow API routes converted to proxies:
- ✅ `src/app/api/messages/threads/route.ts` → Proxy to `/api/threads`
- ✅ `src/app/api/messages/threads/[id]/messages/route.ts` → Proxy to `/api/threads/{id}/messages`
- ✅ `src/app/api/messages/send/route.ts` → Proxy to `/api/messaging/send`
- ✅ `src/app/api/numbers/route.ts` → Proxy to `/api/numbers`
- ✅ `src/app/api/assignments/windows/route.ts` → Proxy to `/api/assignments/windows`

**Note:** Webhook routes (`/api/messages/webhook/twilio`) remain as Next.js routes (they receive external webhooks).

## Step 6: Verify Deployment

**Run:** `API_PUBLIC_URL=https://snout-os-api.onrender.com pnpm verify:deployment`

**Or manually verify:**

1. **API Health:**
   ```bash
   curl https://snout-os-api.onrender.com/health
   # Should return: {"status":"ok","timestamp":"...","service":"snout-os-api"}
   ```

2. **Web Config:**
   ```bash
   curl https://snout-os-staging.onrender.com/api/auth/health
   # Check: env.NEXT_PUBLIC_API_URL should equal API_PUBLIC_URL
   ```

3. **Browser Network Tab:**
   - Visit: `https://snout-os-staging.onrender.com/messages`
   - Open DevTools → Network tab
   - Look for: `https://snout-os-api.onrender.com/api/threads` (NOT `https://snout-os-staging.onrender.com/api/messages/threads`)
   - Export HAR file

4. **Proof Page:**
   - Visit: `https://snout-os-staging.onrender.com/ops/proof`
   - Login as owner
   - Click "Run All Tests"
   - All tests should show ✅ PASS
   - Screenshot showing API base URL = `https://snout-os-api.onrender.com`

5. **Worker Evidence:**
   - Check Render logs for `snout-os-worker`
   - Should see: "🚀 Workers started: Message Retry Worker, Automation Worker"
   - Trigger a retry or automation job
   - Check Audit/Alerts for evidence of worker execution

## Acceptance Criteria

✅ `GET {API_PUBLIC_URL}/health` → 200  
✅ Browser Network tab: `/messages` calls `{API_PUBLIC_URL}/api/threads`  
✅ `GET {API_PUBLIC_URL}/api/messages/threads` → 200 (with auth)  
✅ Worker running: retries + automations + pool release execute  

## Files Modified

1. ✅ `src/app/api/messages/threads/route.ts` - Converted to proxy
2. ✅ `src/app/api/messages/threads/[id]/messages/route.ts` - Converted to proxy
3. ✅ `src/app/api/messages/send/route.ts` - Converted to proxy
4. ✅ `src/app/api/numbers/route.ts` - Converted to proxy
5. ✅ `src/app/api/assignments/windows/route.ts` - Converted to proxy
6. ✅ `src/app/ops/proof/page.tsx` - Updated to test API endpoints
7. ✅ `scripts/get-render-inventory.ts` - Helper script
8. ✅ `scripts/verify-deployment.ts` - Verification script
9. ✅ `enterprise-messaging-dashboard/apps/api/src/health.controller.ts` - Public health endpoint
10. ✅ `enterprise-messaging-dashboard/apps/api/src/worker.ts` - Worker entry point
