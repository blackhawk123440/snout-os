# How to Test Messaging and Masking

## Quick Start: Generate Test Data

### Option 1: Use "Generate Demo Data" Button (Easiest)

1. **Navigate to:** `/messages?tab=inbox`
2. **Look for:** "Generate Demo Data" button (bottom-right diagnostics panel, or in empty state)
3. **Click it**
4. **Expected:** Creates:
   - 1 unread thread (with 2 unread messages)
   - 1 failed delivery message (Retry button visible)
   - 1 policy violation message (banner visible)
   - 1 active assignment window
   - 1 quarantined number
5. **Refresh page** to see the data

### Option 2: Use "Run Messaging Proof" Button

1. **Navigate to:** `/messages?tab=inbox`
2. **Look for:** "Run Messaging Proof" button (in diagnostics panel)
3. **Click it**
4. **Expected:** 
   - Seeds data automatically
   - Shows proof results panel with pass/fail for each check
   - Displays URLs, status codes, response sizes

### Option 3: Use API Directly (DevTools Console)

1. **Open DevTools** (F12) → Console tab
2. **Run:**
   ```javascript
   fetch('/api/messages/seed-proof', { method: 'POST' })
     .then(r => r.json())
     .then(console.log);
   ```
3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Proof scenarios seeded successfully",
     "summary": {
       "unreadThreadId": "...",
       "failedDeliveryThreadId": "...",
       "policyViolationThreadId": "...",
       "quarantinedNumberE164": "+15559876545"
     }
   }
   ```

## Test Scenarios

### Test 1: View Threads and Messages

**Steps:**
1. Navigate to: `/messages?tab=inbox`
2. **Expected:**
   - Thread list on left shows at least 1 thread
   - Click a thread → Messages appear on right
   - Messages show sender labels, timestamps

**Verify in DevTools:**
- Network → `GET /api/messages/threads` → `200 OK`
- Response: `{ threads: [...] }`
- Network → `GET /api/messages/threads/:id/messages` → `200 OK`
- Response: `{ messages: [...] }`

### Test 2: Failed Delivery + Retry

**Steps:**
1. Navigate to: `/messages?tab=inbox`
2. Find a message with **"Failed"** badge (red)
3. **Expected:**
   - Red "Failed" badge visible
   - **"Retry"** button visible
4. Click **"Retry"**
5. **Expected:**
   - Button shows "Retrying..."
   - Network → `POST /api/messages/:id/retry` → `200 OK`
   - Message status updates

**Verify:**
- Network tab shows: `POST /api/messages/{messageId}/retry` → `200 OK`
- Response: `{ success: true, attemptNo: 2 }`

### Test 3: Policy Violation Banner

**Steps:**
1. Navigate to: `/messages?tab=inbox`
2. Find a message with **policy violation**
3. **Expected:**
   - Yellow/red banner: "Policy violation detected"
   - Message shows violation details (phone numbers, emails redacted)
   - "Why routed here?" drawer available

**Verify:**
- Message has `hasPolicyViolation: true`
- Banner shows violation type (phone number, email, etc.)

### Test 4: Assignment Window Active

**Steps:**
1. Navigate to: `/messages?tab=inbox`
2. Find a thread with **active assignment window**
3. **Expected:**
   - Thread shows sitter name
   - Window dates shown (if visible in UI)
4. Navigate to: `/messages?tab=assignments`
5. **Expected:**
   - Assignment window listed
   - Shows start/end times
   - Shows sitter name

**Verify:**
- Network → `GET /api/assignments/windows` → `200 OK`
- Response shows active windows

### Test 5: Send Message (Owner)

**Steps:**
1. Navigate to: `/messages?tab=inbox`
2. Select a thread
3. Type message in compose box (bottom)
4. Click **"Send"**
5. **Expected:**
   - Network → `POST /api/messages/send` → `200 OK`
   - Message appears in thread immediately
   - Shows "Sent" or "Delivered" status
   - Message sent from thread's masking number

**Verify:**
- Network tab shows: `POST /api/messages/send` → `200 OK`
- Request body: `{ threadId: "...", body: "your message" }`
- Response: `{ id: "...", direction: "outbound", ... }`

### Test 6: Verify Masking Number

**Steps:**
1. Navigate to: `/messages?tab=numbers`
2. Find a number assigned to a sitter
3. **Expected:**
   - Number shows "Assigned To: [Sitter Name]"
   - Number class: "sitter"
4. Navigate to: `/messages?tab=inbox`
5. Select a thread with active assignment window
6. Click **"Why routed here?"** button
7. **Expected:**
   - Drawer opens
   - Shows routing trace
   - Shows: "Active assignment window for sitter [name]"
   - Shows masking number used

**Verify:**
- Network → `GET /api/routing/threads/:id/history` → `200 OK`
- Response shows routing decision and trace

### Test 7: Sitter Messaging (If You Have Sitter Account)

**Steps:**
1. **Login as sitter:** `/sitter/inbox`
2. **Expected:**
   - Shows only threads with active assignment windows
   - Client E164 hidden (masked)
   - Compose enabled only during active window
3. Try to send message **outside** window (if window expired)
4. **Expected:**
   - Error: "You cannot send messages outside your active assignment window"
   - Network → `POST /api/messages/send` → `403 Forbidden`

**Verify:**
- Network tab shows: `POST /api/messages/send` → `403 Forbidden`
- Response: `{ error: "You cannot send messages outside your active assignment window" }`

### Test 8: Quarantine + Restore

**Steps:**
1. Navigate to: `/messages?tab=numbers`
2. Find a number (not assigned to sitter)
3. Click 3-dot menu → **"Quarantine"**
4. **Expected:**
   - Modal shows duration selector (1/3/7/14/30/90 days or custom date)
   - Enter reason: "Testing quarantine"
   - Click "Quarantine"
5. **Expected:**
   - Network → `POST /api/numbers/:id/quarantine` → `200 OK`
   - Number status: "quarantined"
   - Shows release date
6. Click **"Restore Now"** button
7. **Expected:**
   - Modal asks for restore reason
   - Enter reason: "Testing restore"
   - Click "Restore"
   - Network → `POST /api/numbers/:id/release` → `200 OK`
   - Number status: "active"

**Verify:**
- Network → `POST /api/numbers/{numberId}/quarantine` → `200 OK`
- Request body: `{ reason: "...", durationDays: 7 }`
- Network → `POST /api/numbers/{numberId}/release` → `200 OK`
- Request body: `{ forceRestore: true, restoreReason: "..." }`

## Network Verification Checklist

### Required Endpoints (All Should Return 200)

- ✅ `GET /api/messages/threads` - List threads
- ✅ `GET /api/messages/threads/:id/messages` - Get messages
- ✅ `POST /api/messages/send` - Send message
- ✅ `POST /api/messages/:id/retry` - Retry failed message
- ✅ `GET /api/routing/threads/:id/history` - Routing trace
- ✅ `GET /api/sitters` - List sitters (with `X-Snout-Api: sitters-route-hit` header)
- ✅ `GET /api/numbers` - List numbers
- ✅ `POST /api/numbers/:id/quarantine` - Quarantine number
- ✅ `POST /api/numbers/:id/release` - Release number

## What to Look For

### In Inbox Tab (`/messages?tab=inbox`)
- ✅ Thread list with filters (Unread, Policy Issues, Delivery Failures)
- ✅ Message panel with sender labels, timestamps
- ✅ Delivery status badges (Sent, Delivered, Failed)
- ✅ Retry button on failed deliveries
- ✅ Policy violation banner
- ✅ "Why routed here?" routing trace drawer
- ✅ Compose box (only in selected thread)

### In Numbers Tab (`/messages?tab=numbers`)
- ✅ Number list with class, status, assigned sitter
- ✅ Quarantine modal with duration selector
- ✅ Restore Now with reason required
- ✅ Assign to Sitter dropdown populated (no 404s)

### In Assignments Tab (`/messages?tab=assignments`)
- ✅ Assignment window list
- ✅ Create window form
- ✅ Window status (active/future/past)

### In Sitters Tab (`/messages?tab=sitters`)
- ✅ Sitter list with status
- ✅ Active assignment count
- ✅ No 404s, shows sitters from your org

## Troubleshooting

### No Threads Appear
1. **Check:** Network → `GET /api/messages/threads` → Status code
2. **If 401:** Check you're logged in as owner
3. **If 404:** Check `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` env var
4. **If 200 with empty array:** Click "Generate Demo Data" button

### Messages Don't Send
1. **Check:** Network → `POST /api/messages/send` → Status code
2. **If 400:** Check error message in response
3. **If 500:** Check server logs
4. **If Twilio error:** Check Twilio credentials in `/messages?tab=setup`

### Masking Not Working
1. **Check:** Assignment window is active (current time between start/end)
2. **Check:** Sitter has assigned number (class: "sitter")
3. **Check:** "Why routed here?" drawer shows routing trace
4. **Check:** Thread's `numberId` matches sitter's assigned number

### Sitter Can't Send
1. **Check:** Assignment window is active
2. **Check:** Sitter is logged in (not owner)
3. **Check:** Network shows `403 Forbidden` with message: "outside your active assignment window"

## Quick Test Commands

### Generate Demo Data (Console)
```javascript
fetch('/api/messages/seed-proof', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### Check Threads (Console)
```javascript
fetch('/api/messages/threads')
  .then(r => r.json())
  .then(d => console.log('Threads:', d.threads?.length || 0));
```

### Send Test Message (Console)
```javascript
// Get first thread ID first
fetch('/api/messages/threads')
  .then(r => r.json())
  .then(d => {
    const threadId = d.threads[0].id;
    return fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, body: 'Test message' })
    });
  })
  .then(r => r.json())
  .then(console.log);
```

## Success Indicators

✅ All endpoints return `200 OK` (or expected error codes)  
✅ Threads and messages visible in UI  
✅ Failed delivery shows Retry button  
✅ Policy violation shows banner  
✅ Assignment windows create and show correctly  
✅ Masking numbers assigned to sitters  
✅ Messages send from correct masking number  
✅ Quarantine and restore work with duration selector  
✅ Sitter blocked outside assignment window  
✅ "Why routed here?" shows routing trace  
