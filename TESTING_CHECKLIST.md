# Feature Testing Checklist

**Server:** http://localhost:3000  
**Status:** ✅ Running

---

## 🎯 Test 1: Build Badge (Owner-Only)

### Steps:
1. Open http://localhost:3000
2. Log in as owner (or ensure you're logged in as owner)
3. Look at **bottom-right corner** of any page

### Expected Result:
- ✅ Small black badge showing: `Build: <sha> | <timestamp>`
- ✅ Only visible to owners (not sitters)

### If Missing:
- Check that you're logged in as owner
- Check browser console for errors

---

## 🎯 Test 2: Diagnostics Panel on /messages

### Steps:
1. Navigate to http://localhost:3000/messages
2. Look at **bottom-right corner** for "Ops / Diagnostics" card
3. Click "Show" to expand

### Expected Result:
- ✅ Panel visible (owner-only)
- ✅ Shows "Feature Flag: NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true/false"
- ✅ Shows "API Base URL (resolved): http://localhost:3001" (or your API URL)
- ✅ Shows "User (from /api/auth/me): <email> (owner)"
- ✅ Shows "Last Fetch:" with URL, status code, response size
- ✅ Shows "Threads: X found" or "Loading..."

### Test Scenarios:

#### A) Messaging Enabled (Flag ON)
- Feature flag should show `true` (green)
- Should see inbox UI with thread list
- Last fetch should show status 200 (if API running)

#### B) Messaging Disabled (Flag OFF)
- Feature flag should show `false` (red)
- Should see "Messaging is disabled" empty state
- **Diagnostics panel should still be visible** (this is the fix!)

---

## 🎯 Test 3: Feature Flag Gating

### Steps:
1. Check current flag value in diagnostics panel
2. If `true`, change `.env.local` to set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=false`
3. Restart dev server: `pnpm dev`
4. Refresh `/messages` page
5. Check diagnostics panel again

### Expected Result:
- ✅ Flag shows `false` in diagnostics
- ✅ "Messaging is disabled" message shows
- ✅ Diagnostics panel still visible (even when disabled)

---

## 🎯 Test 4: API Connectivity Diagnostics

### Steps:
1. Navigate to `/messages`
2. Expand diagnostics panel
3. Check "Last Fetch" section

### Test Scenarios:

#### A) API Running (Success)
- Status: **200**
- Response size: > 0 bytes
- URL: `http://localhost:3001/api/messages/threads` (or your API URL)

#### B) API Not Running (404)
- Status: **404** or network error
- Error message: "Wrong API base URL or route not deployed"
- Red error badge in diagnostics

#### C) Auth Issue (401/403)
- Status: **401** or **403**
- Error message: "JWT/auth mismatch: You're not logged in to API / JWT missing"
- Red error badge in diagnostics

#### D) API Down (5xx)
- Status: **500** or higher
- Error message: "API down: Server error (5xx)"
- Red error badge in diagnostics

#### E) DB Empty (0 threads)
- Status: **200**
- Threads: **0 found**
- Warning: "DB empty — seed required"
- "Create Demo Data" button visible (if dev mode)

---

## 🎯 Test 5: Sitter Deep-Link

### Steps:
1. Navigate to http://localhost:3000/sitters/<any-sitter-id>
2. Find "Messaging" section (should show business number, active windows)
3. Click "Open Inbox" button
4. Verify navigation and filtering

### Expected Result:
- ✅ URL changes to `/messages?sitterId=<id>`
- ✅ Thread list filters to show only threads for that sitter
- ✅ Most recent thread auto-selected (if threads exist)
- ✅ If no threads: Shows "No active conversations for this sitter"

### If Not Working:
- Check browser console for navigation errors
- Verify sitter ID is in URL parameter
- Check diagnostics panel for API errors

---

## 🎯 Test 6: Messaging Inbox UI (When Enabled)

### Steps:
1. Ensure `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in `.env.local`
2. Navigate to `/messages`
3. Test inbox features

### Expected Result:
- ✅ Thread list on left side
- ✅ Message view on right side (when thread selected)
- ✅ Compose box (thread-bound only)
- ✅ Filters: Unread, Policy Issues, Delivery Failures
- ✅ Search box
- ✅ Routing trace drawer ("Why routed here?")
- ✅ Retry button on failed messages
- ✅ Policy violation handling

---

## 🎯 Test 7: Error Categorization

### Steps:
1. Navigate to `/messages`
2. Expand diagnostics panel
3. Test different error scenarios

### Expected Error Messages:

| Status Code | Expected Message |
|-------------|------------------|
| 401/403 | "JWT/auth mismatch: You're not logged in to API / JWT missing" |
| 404 | "Wrong API base URL or route not deployed: /api/messages/threads not found" |
| 500+ | "API down: Server error (5xx)" |
| 200, 0 threads | "DB empty — seed required" |

---

## 🎯 Test 8: User Info Display

### Steps:
1. Navigate to `/messages`
2. Expand diagnostics panel
3. Check "User (from /api/auth/me)" section

### Expected Result:
- ✅ Shows your email address
- ✅ Shows your role (owner/sitter)
- ✅ Fetched from `/api/auth/me` endpoint

---

## 🎯 Test 9: API Base URL Resolution

### Steps:
1. Navigate to `/messages`
2. Expand diagnostics panel
3. Check "API Base URL (resolved)" section

### Expected Result:
- ✅ Shows the actual URL used by the client
- ✅ Shows raw env var value below it
- ✅ Matches your API server URL (e.g., `http://localhost:3001`)

---

## 🎯 Test 10: Build Timestamp

### Steps:
1. Check build badge (bottom-right)
2. Verify timestamp is recent

### Expected Result:
- ✅ Shows ISO timestamp format
- ✅ Timestamp is from current build (not old)

---

## Quick Test Summary

**Must Work:**
- [ ] Build badge visible (owner-only, bottom-right)
- [ ] Diagnostics panel visible on `/messages` (owner-only)
- [ ] Diagnostics shows even when messaging disabled
- [ ] Feature flag value displayed correctly
- [ ] API base URL displayed correctly
- [ ] User info displayed correctly
- [ ] Last fetch shows correct status code
- [ ] Error categorization works (401, 404, 5xx, 0 threads)
- [ ] Sitter deep-link navigates correctly
- [ ] Thread filtering works with sitterId param

**Test URLs:**
- Home: http://localhost:3000
- Messages: http://localhost:3000/messages
- Sitter: http://localhost:3000/sitters/<id>
- Login: http://localhost:3000/login

---

## Troubleshooting

### If diagnostics panel doesn't show:
- Verify you're logged in as owner (not sitter)
- Check browser console for errors
- Verify component is imported correctly

### If build badge doesn't show:
- Verify you're logged in as owner
- Check that `NEXT_PUBLIC_GIT_SHA` and `NEXT_PUBLIC_BUILD_TIME` are set (optional for local)

### If API errors:
- Check that API server is running on port 3001
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check API server logs

### If sitter deep-link doesn't work:
- Check browser console for navigation errors
- Verify sitter ID is passed in URL
- Check that InboxView reads `sitterId` from URL params
