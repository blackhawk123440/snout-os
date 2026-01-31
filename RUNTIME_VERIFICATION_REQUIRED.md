# Runtime Verification Required

## What Was Changed

### Files Modified:
1. **`src/lib/api/hooks.ts`**
   - Fixed `useThread` to call `/api/messages/threads/${threadId}` (was `/api/threads/${threadId}`)
   - Fixed response parsing to extract `thread` from `{ thread: {...} }` response

2. **`src/app/api/messages/threads/[id]/route.ts`**
   - Added `assignmentWindows` to Prisma query include
   - Fixed response format to match Zod schema exactly:
     - Returns `{ thread: Thread, messages: [...], pagination: {...} }`
     - Thread object matches `threadSchema` with all required fields
     - `assignmentWindows` array included in correct format

3. **`src/app/api/messages/[id]/retry/route.ts`** (already created)
   - Retry endpoint exists and should work

## Expected API Calls (Verify in Browser DevTools → Network)

### 1. GET /api/messages/threads
**When:** Page loads, every 5 seconds (when tab visible)
**URL:** `/api/messages/threads?inbox=all` (or `?scope=internal` for Owner Inbox tab)
**Expected Status:** 200
**Expected Response Shape:**
```json
{
  "threads": [
    {
      "id": "...",
      "client": { "id": "...", "name": "...", "contacts": [...] },
      "sitter": { "id": "...", "name": "..." } | null,
      "messageNumber": { "id": "...", "e164": "...", "class": "...", "status": "..." },
      "assignmentWindows": [{ "id": "...", "startsAt": "...", "endsAt": "..." }],
      "ownerUnreadCount": 0,
      "lastActivityAt": "..."
    }
  ],
  "pagination": { ... }
}
```

### 2. GET /api/messages/threads/:id
**When:** Thread is selected in UI
**URL:** `/api/messages/threads/{threadId}`
**Expected Status:** 200
**Expected Response Shape:**
```json
{
  "thread": {
    "id": "...",
    "client": { "id": "...", "name": "...", "contacts": [...] },
    "sitter": { "id": "...", "name": "..." } | null,
    "messageNumber": { "id": "...", "e164": "...", "class": "...", "status": "..." },
    "assignmentWindows": [{ "id": "...", "startsAt": "...", "endsAt": "..." }],
    ...
  },
  "messages": [...],
  "pagination": { ... }
}
```

### 3. GET /api/messages/threads/:id/messages
**When:** Thread is selected (separate from thread endpoint)
**URL:** `/api/messages/threads/{threadId}/messages`
**Expected Status:** 200
**Expected Response Shape:**
```json
[
  {
    "id": "...",
    "direction": "inbound" | "outbound",
    "senderType": "client" | "sitter" | "owner" | "system" | "automation",
    "body": "...",
    "deliveries": [
      {
        "id": "...",
        "attemptNo": 1,
        "status": "queued" | "sent" | "delivered" | "failed",
        "providerErrorCode": "..." | null,
        "providerErrorMessage": "..." | null
      }
    ],
    "policyViolations": [...],
    "hasPolicyViolation": false,
    "createdAt": "..."
  }
]
```

### 4. GET /api/routing/threads/:id/history
**When:** "Why routed here?" button is clicked
**URL:** `/api/routing/threads/{threadId}/history`
**Expected Status:** 200
**Expected Response Shape:**
```json
{
  "events": [
    {
      "decision": {
        "target": "owner_inbox" | "sitter" | "client",
        "targetId": "..." | null,
        "reason": "...",
        "evaluationTrace": [
          {
            "step": 1,
            "rule": "...",
            "condition": "...",
            "result": true,
            "explanation": "..."
          }
        ],
        "rulesetVersion": "...",
        "evaluatedAt": "..."
      },
      "timestamp": "..."
    }
  ]
}
```

### 5. POST /api/messages/:id/retry
**When:** "Retry" button is clicked on a failed message
**URL:** `/api/messages/{messageId}/retry`
**Expected Status:** 200
**Expected Response Shape:**
```json
{
  "success": true,
  "attemptNo": 2,
  "deliveryId": "..."
}
```

## How to Verify

### Step 1: Start Services
```bash
# Terminal 1: API
cd apps/api
pnpm dev  # Port 3001

# Terminal 2: Web
cd apps/web
pnpm dev  # Port 3000
```

### Step 2: Login & Navigate
1. Go to `http://localhost:3000/login`
2. Login: `leah2maria@gmail.com` / `Saint214!`
3. Navigate to `/messages`

### Step 3: Open DevTools
- Press F12 or Cmd+Option+I
- Go to **Network** tab
- Filter by "Fetch/XHR"

### Step 4: Verify Each Endpoint

**A. Threads List:**
- Look for: `GET /api/messages/threads?...`
- Status should be: **200**
- Response should have: `threads` array with at least one thread
- Check: Each thread has `client.name`, `messageNumber.e164`, `messageNumber.class`

**B. Thread Selection:**
- Click a thread in the left panel
- Look for: `GET /api/messages/threads/{threadId}`
- Status should be: **200**
- Response should have: `thread` object matching schema
- Also look for: `GET /api/messages/threads/{threadId}/messages`
- Status should be: **200**
- Response should be: Array of messages with `deliveries[]` and `policyViolations[]`

**C. Routing Drawer:**
- Click "Why routed here?" button
- Look for: `GET /api/routing/threads/{threadId}/history`
- Status should be: **200**
- Response should have: `events[0].decision.evaluationTrace` array

**D. Retry Button:**
- Find a message with `deliveries[0].status === 'failed'`
- Click "Retry" button
- Look for: `POST /api/messages/{messageId}/retry`
- Status should be: **200**
- Response should have: `success: true, attemptNo: 2`

### Step 5: Verify Filters
- Click "Unread" filter
- Check Network tab: URL should include `?unreadOnly=true`
- Click "Policy Issues" filter
- Check Network tab: URL should include `?hasPolicyViolation=true`
- Click "Delivery Failures" filter
- Check Network tab: URL should include `?hasDeliveryFailure=true`

### Step 6: Verify Polling
- Watch Network tab for 10 seconds
- Should see `GET /api/messages/threads` every ~5 seconds
- Should see `GET /api/messages/threads/{id}/messages` every ~3 seconds (if thread selected)
- Switch to another browser tab
- Polling should stop (no new requests)

## Common Issues & Fixes

**Issue: "GET /api/messages/threads returns 404"**
- Check: `ENABLE_MESSAGING_V1=true` in API `.env`
- Check: API server is running on port 3001

**Issue: "GET /api/messages/threads/{id} returns 404"**
- Check: Thread ID is valid
- Check: Route file exists at `src/app/api/messages/threads/[id]/route.ts`

**Issue: "Response doesn't match schema"**
- Check: Response has all required fields
- Check: `assignmentWindows` is an array (not null/undefined)
- Check: `client.name` exists (not null)

**Issue: "Messages endpoint not called when thread selected"**
- Check: `useMessages` hook is enabled when `threadId` is set
- Check: Console for React Query errors

**Issue: "Retry button doesn't work"**
- Check: Message has `deliveries[0].status === 'failed'`
- Check: `POST /api/messages/{id}/retry` endpoint exists
- Check: Console for errors

## Seed Data Command

If threads are empty:
```bash
cd apps/api
npx tsx ../../scripts/seed-messaging-data.ts
```

Or use the "Create Demo Data" button in the UI (dev-only, visible when threads=0).

## What to Report

After verification, report:
1. **Which endpoints fired** (URL + status code)
2. **Response shape matches** (yes/no for each endpoint)
3. **Any missing features** (filters not working, retry not working, etc.)
4. **Console errors** (if any)
