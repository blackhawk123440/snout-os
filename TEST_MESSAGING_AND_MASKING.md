# Test Messaging and Masking System

## Prerequisites

1. **Login as Owner** in your dashboard
2. **Ensure you have:**
   - At least 1 sitter created (via `/bookings/sitters`)
   - At least 1 messaging number configured (via `/messages?tab=numbers`)
   - Twilio credentials set up (via `/messages?tab=setup`) - OR use mock mode

## Quick Test: Generate Demo Data

### Option 1: Use Seed Proof Button (Easiest)

1. Navigate to: `/messages?tab=inbox`
2. Look for **"Run Messaging Proof"** or **"Generate Demo Data"** button
3. Click it
4. **Expected:**
   - Creates 1 unread thread
   - Creates 1 failed delivery message (with Retry button)
   - Creates 1 policy violation message (with banner)
   - Creates 1 active assignment window
   - Creates 1 quarantined number

### Option 2: Use API Endpoint Directly

1. Open DevTools → Console
2. Run:
   ```javascript
   fetch('/api/messages/seed-proof', { method: 'POST' })
     .then(r => r.json())
     .then(console.log);
   ```
3. **Expected Response:**
   ```json
   {
     "success": true,
     "created": {
       "threads": 1,
       "messages": 3,
       "assignmentWindows": 1,
       "quarantinedNumbers": 1
     }
   }
   ```

## Test Scenarios

### Test 1: View Threads and Messages

1. Navigate to: `/messages?tab=inbox`
2. **Expected:**
   - Thread list on left shows at least 1 thread
   - Click a thread → Messages appear on right
   - Messages show sender labels, timestamps
3. **Verify in DevTools:**
   - Network → `GET /api/messages/threads` → `200 OK`
   - Response: `{ threads: [...] }`
   - Network → `GET /api/messages/threads/:id/messages` → `200 OK`
   - Response: `{ messages: [...] }`

### Test 2: Failed Delivery + Retry

1. Navigate to: `/messages?tab=inbox`
2. Find a message with **"Failed"** badge
3. **Expected:**
   - Red "Failed" badge visible
   - **"Retry"** button visible
4. Click **"Retry"**
5. **Expected:**
   - Button shows "Retrying..."
   - Network → `POST /api/messages/:id/retry` → `200 OK`
   - Message status updates

### Test 3: Policy Violation Banner

1. Navigate to: `/messages?tab=inbox`
2. Find a message with **policy violation**
3. **Expected:**
   - Yellow/red banner: "Policy violation detected"
   - Message shows violation details
   - "Why routed here?" drawer available

### Test 4: Assignment Window Active

1. Navigate to: `/messages?tab=inbox`
2. Find a thread with **active assignment window**
3. **Expected:**
   - Thread shows "Active" badge or indicator
   - Sitter name visible
   - Window dates shown
4. Navigate to: `/messages?tab=assignments`
5. **Expected:**
   - Assignment window listed
   - Shows start/end times
   - Shows sitter name

### Test 5: Send Message (Owner)

1. Navigate to: `/messages?tab=inbox`
2. Select a thread
3. Type message in compose box
4. Click **"Send"**
5. **Expected:**
   - Network → `POST /api/messages/send` → `200 OK`
   - Message appears in thread
   - Shows "Sent" or "Delivered" status
   - Message sent from thread's masking number

### Test 6: Verify Masking Number

1. Navigate to: `/messages?tab=numbers`
2. Find a number assigned to a sitter
3. **Expected:**
   - Number shows "Assigned To: [Sitter Name]"
   - Number class: "sitter"
4. Navigate to: `/messages?tab=inbox`
5. Select a thread with active assignment window
6. **Expected:**
   - Thread shows sitter's masked number
   - "Why routed here?" shows: "Active assignment window for sitter [name]"

### Test 7: Sitter Messaging (If You Have Sitter Account)

1. Login as sitter: `/sitter/inbox`
2. **Expected:**
   - Shows only threads with active assignment windows
   - Client E164 hidden (masked)
   - Compose enabled only during active window
3. Try to send message outside window
4. **Expected:**
   - Error: "You cannot send messages outside your active assignment window"
   - Network → `POST /api/messages/send` → `403 Forbidden`

### Test 8: Quarantine + Restore

1. Navigate to: `/messages?tab=numbers`
2. Find a number (not assigned to sitter)
3. Click 3-dot menu → **"Quarantine"**
4. **Expected:**
   - Modal shows duration selector (1/3/7/14/30/90 days or custom)
   - Enter reason
   - Click "Quarantine"
5. **Expected:**
   - Network → `POST /api/numbers/:id/quarantine` → `200 OK`
   - Number status: "quarantined"
   - Shows release date
6. Click **"Restore Now"**
7. **Expected:**
   - Modal asks for restore reason
   - Enter reason
   - Click "Restore"
   - Network → `POST /api/numbers/:id/release` → `200 OK`
   - Number status: "active"

## Network Verification Checklist

### Required Endpoints (All Should Return 200)

- `GET /api/messages/threads` - List threads
- `GET /api/messages/threads/:id/messages` - Get messages
- `POST /api/messages/send` - Send message
- `POST /api/messages/:id/retry` - Retry failed message
- `GET /api/routing/threads/:id/history` - Routing trace
- `GET /api/sitters` - List sitters
- `GET /api/numbers` - List numbers
- `POST /api/numbers/:id/quarantine` - Quarantine number
- `POST /api/numbers/:id/release` - Release number

### Response Headers to Check

- `X-Snout-Api: sitters-route-hit` (on `/api/sitters`)
- `X-Snout-OrgId: <your-org-id>` (on `/api/sitters`)

## Manual Test Data Creation

If seed-proof doesn't work, create manually:

### 1. Create Sitter
- Navigate to: `/bookings/sitters`
- Click "Add Sitter"
- Fill: First Name, Last Name, Active = true
- **Expected:** Sitter created, assigned masked number automatically

### 2. Create Messaging Number
- Navigate to: `/messages?tab=numbers`
- Click "Buy Number" or "Import Number"
- Enter E.164: `+15005550006` (Twilio test number)
- Select class: "sitter" or "pool"
- **Expected:** Number created and active

### 3. Create Assignment Window
- Navigate to: `/messages?tab=assignments`
- Click "Create Assignment Window"
- Select thread, sitter, start/end times
- **Expected:** Window created, thread routes to sitter

### 4. Create Thread (via Booking Confirmation)
- Create a booking in `/bookings`
- Confirm booking (payment succeeds)
- **Expected:** 
  - Thread created automatically
  - Assignment window created
  - Masking number assigned

## Troubleshooting

### No Threads Appear
- Check: `GET /api/messages/threads` returns `200 OK`
- Check: Response has `{ threads: [...] }` (not empty array)
- Check: You're logged in as owner
- Check: OrgId is set in session

### Messages Don't Send
- Check: `POST /api/messages/send` status code
- Check: Error message in response
- Check: Twilio credentials configured (or mock mode enabled)
- Check: Thread has assigned number

### Masking Not Working
- Check: Assignment window is active (current time between start/end)
- Check: Sitter has assigned number (class: "sitter")
- Check: "Why routed here?" drawer shows routing trace
- Check: Thread's `numberId` matches sitter's assigned number

### Sitter Can't Send
- Check: Assignment window is active
- Check: Sitter is logged in (not owner)
- Check: Network shows `403 Forbidden` with message: "outside your active assignment window"

## Expected UI Features

### Inbox Tab (`/messages?tab=inbox`)
- ✅ Thread list with filters (Unread, Policy Issues, Delivery Failures)
- ✅ Message panel with sender labels, timestamps
- ✅ Delivery status badges (Sent, Delivered, Failed)
- ✅ Retry button on failed deliveries
- ✅ Policy violation banner
- ✅ "Why routed here?" routing trace drawer
- ✅ Compose box (only in selected thread)

### Numbers Tab (`/messages?tab=numbers`)
- ✅ Number list with class, status, assigned sitter
- ✅ Quarantine modal with duration selector
- ✅ Restore Now with reason required
- ✅ Assign to Sitter dropdown populated

### Assignments Tab (`/messages?tab=assignments`)
- ✅ Assignment window list
- ✅ Create window form
- ✅ Overlap detection
- ✅ Window status (active/future/past)

### Sitters Tab (`/messages?tab=sitters`)
- ✅ Sitter list with status
- ✅ Active assignment count
- ✅ View threads button
- ✅ Open inbox view button

## Success Criteria

✅ All endpoints return `200 OK` (or expected error codes)  
✅ Threads and messages visible in UI  
✅ Failed delivery shows Retry button  
✅ Policy violation shows banner  
✅ Assignment windows create and show correctly  
✅ Masking numbers assigned to sitters  
✅ Messages send from correct masking number  
✅ Quarantine and restore work with duration selector  
✅ Sitter blocked outside assignment window  
