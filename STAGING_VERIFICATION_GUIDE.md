# Staging & Local Verification Guide

**Purpose:** Ensure staging and local show the SAME messaging UI and diagnose any mismatches.

---

## A) Build Proof in UI

### What to Look For
- **Location:** Bottom-right corner of any page (owner-only)
- **Shows:** `Build: <commit-sha-7-chars> | <build-timestamp>`
- **Example:** `Build: a1b2c3d | 2025-01-28T12:34:56Z`

### How to Verify
1. Log in as owner
2. Check bottom-right corner for build badge
3. Verify commit SHA matches the deployed commit
4. Verify build timestamp is recent

### If Missing
- Check that `NEXT_PUBLIC_GIT_SHA` and `NEXT_PUBLIC_BUILD_TIME` are set in Render env vars
- Check that user has `owner` role

---

## B) Diagnostics Panel on /messages

### What to Look For
- **Location:** Bottom-right corner of `/messages` page (owner-only)
- **Shows:** "Ops / Diagnostics" card (expandable)

### Required Information Displayed
1. **Feature Flag:**
   - `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true/false` (raw value)
   - Color-coded: green if `true`, red if `false`

2. **API Base URL:**
   - Resolved URL (what client actually uses)
   - Raw env var value below it

3. **User Info:**
   - Email and role from `/api/auth/me`
   - Format: `email@example.com (owner)`

4. **Last Fetch:**
   - URL: Full request URL to `/api/messages/threads`
   - Status: HTTP status code (200, 401, 404, 500, etc.)
   - Size: Response size in bytes

5. **Error Details:**
   - Full error message if request failed
   - Stack trace (dev only)

6. **Thread Count:**
   - Number of threads loaded
   - Loading state indicator

### Error Categorization
The panel automatically categorizes errors:

- **401/403:** "JWT/auth mismatch: You're not logged in to API / JWT missing"
- **404:** "Wrong API base URL or route not deployed: /api/messages/threads not found"
- **5xx:** "API down: Server error (5xx)"
- **0 threads:** "DB empty — seed required" (with "Create Demo Data" button if dev)

### How to Verify
1. Navigate to `/messages` as owner
2. Click "Show" on diagnostics panel (bottom-right)
3. Verify all fields are populated
4. Check that API base URL matches staging API service URL
5. Check that feature flag shows correct value
6. Check that last fetch shows successful request (200) or specific error

---

## C) Feature Flag Gating

### Client-Side Only
- `/messages` page ONLY checks `NEXT_PUBLIC_ENABLE_MESSAGING_V1` (client env var)
- Does NOT use server-side `ENABLE_MESSAGING_V1` for client gating
- Diagnostics panel ALWAYS shows (even when flag is off) to help diagnose

### How to Verify
1. Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=false` in `.env.local` (local) or Render env (staging)
2. Navigate to `/messages`
3. Should see "Messaging is disabled" empty state
4. Diagnostics panel should still be visible (owner-only)
5. Diagnostics should show flag value as `false`

---

## D) Staging Environment Variables

### WEB Service (Render)
Set these environment variables:

```bash
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://<staging-api-service-url>
NEXT_PUBLIC_GIT_SHA=<commit-sha>
NEXT_PUBLIC_BUILD_TIME=<iso-timestamp>
```

**Example:**
```bash
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snoutos-messaging-api.onrender.com
NEXT_PUBLIC_GIT_SHA=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
NEXT_PUBLIC_BUILD_TIME=2025-01-28T12:34:56Z
```

### API Service (Render)
Set these environment variables (existing):

```bash
DATABASE_URL=<postgres-url>
REDIS_URL=<redis-url>
JWT_SECRET=<secret>
ENABLE_MESSAGING_V1=true  # Server-side flag (optional, for server components)
```

### How to Set in Render
1. Go to Render Dashboard
2. Select Web Service
3. Go to "Environment" tab
4. Add/update each variable
5. Save and redeploy

### If Staging Still Shows "Disabled"
Check diagnostics panel for:
1. `NEXT_PUBLIC_ENABLE_MESSAGING_V1` value (should be `true`)
2. If `false`, verify env var is set in Render and service was redeployed
3. If `true` but still disabled, check browser console for errors

---

## E) Verify API Routes on Staging

### Required Endpoints
These endpoints must exist and be accessible:

1. **GET /api/messages/threads**
   - Returns list of threads
   - Accepts query params: `sitterId`, `inbox`, `unreadOnly`, etc.

2. **GET /api/messages/threads/:id**
   - Returns single thread details

3. **GET /api/messages/threads/:id/messages**
   - Returns messages for a thread

4. **POST /api/messages/seed** (dev only)
   - Seeds demo data
   - Gated: `NODE_ENV=development` OR `ALLOW_DEV_SEED=true` + owner role

### How to Verify
1. **From Browser DevTools:**
   - Open Network tab
   - Navigate to `/messages`
   - Look for request to `/api/messages/threads`
   - Check status code (should be 200, not 404)

2. **From Diagnostics Panel:**
   - Check "Last Fetch" section
   - URL should show full API base URL + `/api/messages/threads`
   - Status should be 200 (not 404)

3. **Direct API Test:**
   ```bash
   curl -H "Authorization: Bearer <jwt-token>" \
     https://<staging-api-url>/api/messages/threads
   ```

### If 404 Error
- **Wrong API base URL:** Check `NEXT_PUBLIC_API_URL` matches actual API service URL
- **Route not deployed:** Verify API service includes messaging routes
- **Wrong service:** Verify web service points to correct API service

---

## F) Sitter Integration

### Deep-Link Flow
1. Navigate to `/sitters/:id`
2. Click "Open Inbox" button in Messaging section
3. Should navigate to `/messages?sitterId=<id>`
4. `/messages` should:
   - Apply sitter filter (only show threads for that sitter)
   - Auto-select most recent thread if exists
   - Show "No active conversations for this sitter" if no threads

### How to Verify
1. Go to `/sitters/<any-sitter-id>`
2. Find "Messaging" section
3. Click "Open Inbox"
4. Verify URL changes to `/messages?sitterId=<id>`
5. Verify thread list is filtered (if threads exist)
6. Verify most recent thread is auto-selected (if threads exist)
7. Verify empty state message if no threads

### If Not Working
- Check browser console for navigation errors
- Verify sitter ID is passed correctly in URL
- Check diagnostics panel for API errors

---

## Step-by-Step Verification Script

### 1. Verify Build SHA in UI
```bash
# Expected: Build badge visible in bottom-right (owner-only)
# Action: Log in as owner, check bottom-right corner
# Success: See "Build: <sha> | <timestamp>"
```

### 2. Verify API Base URL Used
```bash
# Expected: Diagnostics panel shows resolved API base URL
# Action: Navigate to /messages, expand diagnostics panel
# Success: See API base URL matching staging API service URL
```

### 3. Verify /api/messages/threads is Reachable
```bash
# Expected: Last fetch shows 200 status
# Action: Navigate to /messages, expand diagnostics panel
# Success: See "Last Fetch" with status 200, not 404
```

### 4. Verify Feature Flag
```bash
# Expected: Flag shows correct value
# Action: Check diagnostics panel "Feature Flag" section
# Success: See "NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true" (green)
```

### 5. Verify Sitter Deep-Link
```bash
# Expected: Navigate from sitter page to filtered messages
# Action: Go to /sitters/:id, click "Open Inbox"
# Success: Navigate to /messages?sitterId=:id, threads filtered
```

---

## Root Cause Diagnosis

Once diagnostics are added, use this decision tree:

### If "Messaging is disabled" shows:
1. **Check diagnostics panel:**
   - If `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = false` → Env var not set or wrong value
   - If `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true` → Check browser console for errors

### If threads don't load:
1. **Check diagnostics panel:**
   - If status 401/403 → JWT/auth issue (logout and login again)
   - If status 404 → Wrong API base URL or route not deployed
   - If status 5xx → API service is down
   - If status 200 but 0 threads → DB empty (seed required)

### If API base URL is wrong:
1. **Check diagnostics panel:**
   - Compare "API Base URL (resolved)" with actual staging API service URL
   - If mismatch → `NEXT_PUBLIC_API_URL` env var is incorrect

### If sitter deep-link doesn't work:
1. **Check browser console:**
   - Look for navigation errors
   - Verify URL parameter is passed correctly
2. **Check diagnostics panel:**
   - Verify API request includes `sitterId` query param
   - Check for API errors

---

## Files Changed

1. **`src/components/ui/BuildHash.tsx`**
   - Removed `NEXT_PUBLIC_SHOW_BUILD_HASH` requirement
   - Always shows for owners

2. **`src/components/messaging/DiagnosticsPanel.tsx`**
   - Always shows for owners (removed dev-only check)
   - Shows resolved API base URL
   - Fetches user info from `/api/auth/me`
   - Enhanced error categorization (401/403, 404, 5xx, 0 threads)

3. **`src/components/messaging/InboxView.tsx`**
   - Added fetch metadata tracking from `window.__lastThreadsFetch`
   - Passes fetch metadata to DiagnosticsPanel

4. **`src/app/messages/page.tsx`**
   - Shows DiagnosticsPanel even when messaging is disabled
   - Updated empty state message to reference `NEXT_PUBLIC_ENABLE_MESSAGING_V1`

---

## Exact Render Env Vars

### WEB Service
```bash
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snoutos-messaging-api.onrender.com
NEXT_PUBLIC_GIT_SHA=<commit-sha-from-git>
NEXT_PUBLIC_BUILD_TIME=<iso-timestamp-at-build>
```

### API Service
```bash
DATABASE_URL=<existing>
REDIS_URL=<existing>
JWT_SECRET=<existing>
ENABLE_MESSAGING_V1=true  # Optional, for server components
```

---

## Quick Verification Checklist

- [ ] Build badge visible (bottom-right, owner-only)
- [ ] Diagnostics panel visible on `/messages` (owner-only)
- [ ] Feature flag shows correct value in diagnostics
- [ ] API base URL matches staging API service URL
- [ ] Last fetch shows 200 status (not 404)
- [ ] User info shows correct email and role
- [ ] Sitter deep-link navigates to `/messages?sitterId=...`
- [ ] Threads filter by sitter when `sitterId` param present
- [ ] Empty state shows for sitter with no threads

---

## Troubleshooting Matrix

| Symptom | Diagnostics Panel Shows | Root Cause | Fix |
|---------|------------------------|------------|-----|
| "Messaging is disabled" | `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = false` | Env var not set | Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in Render |
| No threads | Status 401/403 | JWT/auth mismatch | Logout and login again |
| No threads | Status 404 | Wrong API URL or route missing | Check `NEXT_PUBLIC_API_URL` and verify route exists |
| No threads | Status 5xx | API service down | Check API service health |
| No threads | Status 200, 0 threads | DB empty | Seed database |
| Wrong API URL | Resolved URL doesn't match staging | Env var incorrect | Update `NEXT_PUBLIC_API_URL` in Render |
