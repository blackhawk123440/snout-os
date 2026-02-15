# SnoutOS Testing Guide

## Prerequisites

- Web service: `https://snout-os-staging.onrender.com`
- API service: `https://snout-os-api.onrender.com`
- Owner login: `leah2maria@gmail.com` / `Saint214!`
- Sitter login: `sitter@example.com` / `Saint214!` (if seeded)

---

## Step 1: Basic Health Checks

### API Health
```bash
curl https://snout-os-api.onrender.com/health
```
**Expected:** `{"status":"ok",...}` with HTTP 200

### Web Service
Open in browser: `https://snout-os-staging.onrender.com`
**Expected:** Login page or redirect to login

---

## Step 2: Authentication Testing

### Owner Login
1. Go to: `https://snout-os-staging.onrender.com/login`
2. Enter:
   - Email: `leah2maria@gmail.com`
   - Password: `Saint214!`
3. Click "Sign In"
4. **Expected:** Redirected to dashboard (`/`)

### Logout
1. Click logout button/menu
2. **Expected:** Redirected to `/login`

### Session Persistence
1. After login, refresh the page
2. **Expected:** Still logged in (no redirect to login)

---

## Step 3: Numbers Management (Owner Only)

### View Numbers Inventory
1. Navigate to: `/numbers`
2. **Expected:** Table showing all message numbers (may be empty initially)

### Import a Number
1. Click "Import Number" button
2. Enter:
   - **E.164:** `+15551234567` (or any valid E.164 format)
   - **Class:** Select `front_desk`, `sitter`, or `pool`
   - **Number SID:** (optional, leave blank if using E.164)
3. Click "Import"
4. **Expected:** 
   - Success message: "Number imported successfully"
   - Number appears in the table with status "Active"

**Note:** E.164 format is auto-formatted:
- `5551234567` → `+15551234567`
- `1-555-123-4567` → `+15551234567`
- `+15551234567` → `+15551234567` (already correct)

### Buy a Number (if provider supports it)
1. Click "Buy Number" button
2. Enter:
   - **Area Code:** `555` (3 digits)
   - **Class:** Select class
   - **Quantity:** `1`
3. Click "Buy"
4. **Expected:** Number purchased and appears in table

### Number Actions
- **Quarantine:** Select number → "Quarantine" → Enter reason → Confirm
- **Assign to Sitter:** Select number → "Assign" → Select sitter → Confirm
- **Release to Pool:** Select number → "Release to Pool" → Confirm

---

## Step 4: Messages & Threads (Owner)

### View Messages
1. Navigate to: `/messages`
2. **Expected:** 
   - List of message threads
   - Each thread shows client name, last message, timestamp
   - No 404 errors in browser console

### Send a Message
1. Click on a thread (or create new thread)
2. Type message in compose box
3. Click "Send"
4. **Expected:** 
   - Message appears in thread
   - Delivery status shows (sent/delivered/failed)

### View Thread Details
1. Click on a thread
2. **Expected:**
   - Full message history
   - Client contact info
   - Assignment window info (if assigned)
   - "Why routed here?" trace (if available)

### Retry Failed Delivery
1. Find a message with failed delivery status
2. Click "Retry" button
3. **Expected:** Message re-sent, status updates

---

## Step 5: Assignment Windows (Owner)

### Create Assignment Window
1. Navigate to: `/assignments`
2. Click "Create Assignment Window"
3. Enter:
   - **Sitter:** Select from dropdown
   - **Start Date/Time:** Future date/time
   - **End Date/Time:** After start time
4. Click "Create"
5. **Expected:** Window created, appears in list

### View Active Assignments
1. Navigate to: `/assignments`
2. **Expected:** List of active assignment windows

---

## Step 6: Sitter Access Testing

### Sitter Login
1. Logout as owner
2. Login as sitter: `sitter@example.com` / `Saint214!`
3. **Expected:** 
   - Redirected to `/sitter/inbox` (NOT `/messages`)
   - Cannot access `/messages` (redirected or 403)

### Sitter Inbox
1. Navigate to: `/sitter/inbox`
2. **Expected:**
   - Only threads with active assignment windows visible
   - Compose disabled outside assignment window
   - Can view messages in active threads

### Sitter Restrictions
1. Try to navigate to `/messages` (owner-only)
2. **Expected:** Redirected to `/sitter/inbox` or 403 error

---

## Step 7: Setup Wizard (Owner)

### Provider Setup
1. Navigate to: `/setup`
2. **Expected:** Setup wizard showing steps:
   - Provider connection
   - Numbers status
   - Webhooks configuration

### Test Provider Connection
1. In setup wizard, click "Test Connection"
2. **Expected:** Connection status (success/failure)

### Webhook Configuration
1. Follow setup wizard steps
2. **Expected:** Webhook URL configured and verified

---

## Step 8: Worker Execution Proof

### Trigger Worker Job
1. Navigate to: `/ops/proof`
2. **Expected:** 
   - Page shows API base URL: `https://snout-os-api.onrender.com`
   - Table showing endpoint checks (health, messages, numbers, assignments)
3. Click "Trigger Worker Proof"
4. **Expected:**
   - Button shows "Processing..."
   - Within 10 seconds, new audit event appears:
     - Event type: `ops.proof.job.processed`
     - Timestamp: Current time
     - Job ID: Present
     - Worker metadata: Present

### Verify Worker Logs
1. Go to Render dashboard: https://dashboard.render.com
2. Select `snout-os-worker` service
3. Go to "Logs" tab
4. **Expected:** Logs show:
   - `🚀 Workers started: ...`
   - Job processing logs (if any jobs ran)

---

## Step 9: Network Verification (Browser DevTools)

### Verify Web → API Calls
1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Navigate to `/messages`
4. Refresh page
5. Find request to `messages/threads`
6. **Expected:**
   - Request URL: `https://snout-os-staging.onrender.com/api/messages/threads`
   - NOT `https://snout-os-api.onrender.com/api/messages/threads` (direct browser call)
   - Status: 200 OK
   - Response: JSON array of threads

### Verify BFF Proxy
1. In Network tab, check request headers
2. **Expected:**
   - Request goes to Web service (`snout-os-staging.onrender.com`)
   - BFF proxy forwards to API service server-side
   - Response is valid JSON

### Verify No Shadow Backend
1. Try: `curl -i https://snout-os-staging.onrender.com/api/messages/threads`
2. **Expected:** 
   - 401 (Unauthorized) if not logged in
   - 404 or 503 if route doesn't exist
   - NOT 200 with data (proves no shadow backend)

---

## Step 10: Error Handling

### Invalid Inputs
1. Try importing number with invalid E.164: `123` (no +, too short)
2. **Expected:** Clear error message about E.164 format

### Unauthorized Access
1. Logout
2. Try to access `/messages` directly
3. **Expected:** Redirected to `/login`

### API Errors
1. Check browser console for errors
2. **Expected:** 
   - No 404 errors for `/api/bookings` or `/api/sitters` (handled gracefully)
   - No 500 errors (server errors)

---

## Step 11: Generate Proof Pack (Optional)

### Run Proof Pack Script
```bash
cd snout-os
API_PUBLIC_URL=https://snout-os-api.onrender.com \
WEB_PUBLIC_URL=https://snout-os-staging.onrender.com \
pnpm proof:deployment
```

**Expected Output:**
- `proof-pack/` folder created
- `curl-health.txt` - API health check result
- `network.har` - Network requests showing API host
- `ops-proof.png` - Screenshot of `/ops/proof` page
- `worker-proof.txt` - Worker execution proof

---

## Common Issues & Fixes

### "Invalid email or password"
- **Fix:** Verify user exists in database (check Render shell or seed script)

### "Unauthorized" on API calls
- **Fix:** Check `JWT_SECRET` is set on Web service (must match API/Worker)

### 404 errors in console
- **Fix:** Expected for legacy endpoints (`/api/bookings`, `/api/sitters`) - handled gracefully

### "Invalid E.164 format"
- **Fix:** Enter number with `+` prefix (e.g., `+15551234567`) or let auto-formatting handle it

### Worker not processing jobs
- **Fix:** Check worker service logs in Render, verify `REDIS_URL` is set correctly

---

## Quick Test Checklist

- [ ] API health returns 200
- [ ] Owner can log in
- [ ] Owner can access `/numbers`
- [ ] Owner can import a number
- [ ] Owner can access `/messages`
- [ ] Owner can view threads
- [ ] Sitter can log in
- [ ] Sitter redirected to `/sitter/inbox`
- [ ] Sitter cannot access `/messages`
- [ ] Worker proof job executes (check `/ops/proof`)
- [ ] Network requests go through BFF proxy (not direct to API)
- [ ] No critical errors in browser console

---

## Next Steps

Once all tests pass:
1. System is fully operational
2. Ready for production use
3. Can generate proof pack for documentation

For detailed deployment verification, see `DEPLOYMENT_RUNBOOK.md`.
