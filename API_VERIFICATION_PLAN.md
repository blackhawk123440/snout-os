# API Verification Plan - End-to-End Proof

## Current Architecture Analysis

Based on codebase analysis:

### Current Deployment: `https://snout-os-staging.onrender.com`

**Architecture:** Next.js App with API Routes (Monolith)
- Web app and API are the same service
- API routes live in `src/app/api/`
- `NEXT_PUBLIC_API_URL` is NOT set → uses relative URLs
- All API calls go to same origin: `https://snout-os-staging.onrender.com/api/*`

**Evidence:**
- `src/lib/api/client.ts` line 15: `const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';`
- Line 98: `const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;`
- When `API_BASE_URL` is empty, uses relative URLs (same service)

### Separate API Service (if exists)

There is a separate `enterprise-messaging-dashboard` project with NestJS API, but:
- It's in a different directory: `enterprise-messaging-dashboard/apps/api/`
- It has its own `render.yaml` blueprint
- It's a separate deployment (not the current `snout-os-staging`)

## Step A: Render Reality Check (REQUIRED)

**I cannot access Render Dashboard. Please provide:**

For each service in Render Dashboard for repo `blackhawk123440/snout-os`:

1. **Service name**
2. **Type** (Web Service / Background Worker)
3. **Repo + branch**
4. **Root directory** (if monorepo)
5. **Build command + start command**
6. **Public URL** (if any)

**Expected services:**
- `snout-os-staging` (Next.js) → `https://snout-os-staging.onrender.com` ✅ (confirmed)
- `snout-os-api` (NestJS) → ??? (unknown - may not exist)
- Optional worker service(s)

## Step B: Architecture Decision

### Option 1: Current Architecture (Next.js API Routes) - INTENTIONAL

If the architecture is intentionally using Next.js API routes:
- ✅ No separate API service needed
- ✅ All API calls go to same service
- ✅ Proof: Network HAR will show calls to `https://snout-os-staging.onrender.com/api/*`
- ✅ Verification: `/ops/proof` page will show all tests passing with relative URLs

### Option 2: Separate API Service Required

If a separate API service is required:
- ❌ Current deployment is incomplete
- ❌ Need to create NestJS API service in Render
- ❌ Need to set `NEXT_PUBLIC_API_URL` in web service env vars
- ❌ Need to redeploy web service

## Step C: Proof Page Created

**Location:** `src/app/ops/proof/page.tsx`

**Features:**
- Owner-only access (redirects sitters and unauthenticated users)
- Tests these endpoints:
  - `GET /api/health`
  - `GET /api/messages/threads` (authed)
  - `GET /api/numbers` (authed)
  - `GET /api/assignments/windows` (authed)
- Shows PASS/FAIL for each endpoint
- Displays actual API base URL being used
- Shows response times and status codes
- Provides network evidence instructions

**Access:** `https://snout-os-staging.onrender.com/ops/proof` (owner login required)

## Step D: Network Evidence Capture

### If Using Next.js API Routes (Current):

1. Visit `https://snout-os-staging.onrender.com/ops/proof`
2. Login as owner
3. Click "Run All Tests"
4. Open DevTools → Network tab
5. Look for requests to:
   - `https://snout-os-staging.onrender.com/api/health` → 200
   - `https://snout-os-staging.onrender.com/api/messages/threads` → 200
   - `https://snout-os-staging.onrender.com/api/numbers` → 200
   - `https://snout-os-staging.onrender.com/api/assignments/windows` → 200
6. Export HAR file showing all 200 responses

### If Using Separate API Service:

1. Visit `https://snout-os-staging.onrender.com/ops/proof`
2. Login as owner
3. Click "Run All Tests"
4. Open DevTools → Network tab
5. Look for requests to:
   - `{API_PUBLIC_URL}/health` → 200
   - `{API_PUBLIC_URL}/api/messages/threads` → 200
   - `{API_PUBLIC_URL}/api/numbers` → 200
   - `{API_PUBLIC_URL}/api/assignments/windows` → 200
6. Export HAR file showing all 200 responses

## Step E: Deliverables

Once Render service list is provided:

1. **API_PUBLIC_URL** (if separate service exists) OR confirmation that Next.js API routes are intentional
2. **Screenshot** of `/ops/proof` page showing all tests PASS
3. **HAR file** proving `/api/messages/threads` returns 200
4. **Architecture confirmation** (monolith vs separate services)

## Next Actions

1. **User provides Render service list** (Step A)
2. **Confirm architecture** (monolith or separate API)
3. **If separate API needed:** Create/fix API service
4. **Run proof page** and capture network evidence
5. **Update proof pack** with actual network HAR
