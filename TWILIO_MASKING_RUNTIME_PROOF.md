# Twilio Masking Runtime Proof

This document provides step-by-step instructions for verifying that the messaging system correctly routes messages through Twilio with proper number masking.

## Prerequisites

1. Staging environment deployed with latest code
2. Twilio account configured with:
   - Account SID and Auth Token saved in provider credentials (via `/api/setup/provider/connect`)
   - At least one front_desk number provisioned (via Messages → Numbers)
   - At least one sitter masked number provisioned
   - Webhook URL configured: `https://[your-staging-domain]/api/messages/webhook/twilio`
   - **CRITICAL:** Webhook URL in Twilio Console must match exactly: `${TWILIO_WEBHOOK_URL || NEXT_PUBLIC_APP_URL}/api/messages/webhook/twilio`
3. Test phone number to receive SMS (E.164 format: `+15551234567`)
4. Browser DevTools access for network inspection
5. Database access for verification queries

## Test 1: Owner "Message Anyone" Flow

### Steps

1. **Navigate to Owner Inbox**
   - Go to `/messages` in staging dashboard
   - Click "Owner Inbox" tab
   - Click "New Message" button

2. **Create New Conversation**
   - Enter test phone number in E.164 format (e.g., `+15551234567`)
   - Enter initial message: "Hello, this is a test message"
   - Click "Send"

3. **Verify Network Calls**
   - Open DevTools → Network tab
   - Filter by "threads"
   - **Expected:** `POST /api/messages/threads` returns 200
     - Response: `{ threadId: "...", clientId: "...", reused: false }`
   - Filter by "messages"
   - **Expected:** `POST /api/messages/threads/:threadId/messages` returns 200
     - Response: `{ messageId: "...", providerMessageSid: "SM...", hasPolicyViolation: false }`

4. **Verify Twilio Console**
   - Log into Twilio Console → Messaging → Logs
   - Find message with MessageSid matching `providerMessageSid` from step 3
   - **Expected:**
     - From: Front desk number E164 (e.g., `+15559876543`)
     - To: Test phone number
     - Status: "delivered" or "sent"
     - Body: "Hello, this is a test message"

5. **Verify Database**
   ```sql
   -- Find the message with providerMessageSid
   SELECT id, "threadId", direction, "senderType", body, "providerMessageSid", "createdAt"
   FROM "Message"
   WHERE "providerMessageSid" = 'SM...' -- Use MessageSid from step 4
   ORDER BY "createdAt" DESC
   LIMIT 1;

   -- Verify delivery record exists
   SELECT md.id, md.status, md."providerErrorCode", md."providerErrorMessage"
   FROM "MessageDelivery" md
   JOIN "Message" m ON md."messageId" = m.id
   WHERE m."providerMessageSid" = 'SM...'
   ORDER BY md."attemptNo" DESC
   LIMIT 1;
   -- Expected: status = 'sent', no error codes

   -- Verify thread uniqueness (one thread per org+client)
   SELECT "orgId", "clientId", COUNT(*) as thread_count
   FROM "Thread"
   WHERE "orgId" = '...' AND "clientId" = '...' -- Use IDs from step 3
   GROUP BY "orgId", "clientId"
   HAVING COUNT(*) > 1;
   -- Expected: 0 rows (no duplicates)

   -- Verify thread's number matches front_desk
   SELECT t.id, t."numberId", mn.e164, mn.class, mn.status
   FROM "Thread" t
   JOIN "MessageNumber" mn ON t."numberId" = mn.id
   WHERE t.id = '...' -- Use threadId from step 3
   AND mn.class = 'front_desk';
   -- Expected: 1 row with front_desk number
   ```

### Screenshots Required

1. **DevTools Network tab** showing `POST /api/messages/threads` (200)
   - Request payload: `{ phoneNumber: "+15551234567", initialMessage: "Hello..." }`
   - Response: `{ threadId: "...", clientId: "...", reused: false }`
2. **DevTools Network tab** showing `POST /api/messages/threads/:threadId/messages` (200)
   - Request payload: `{ body: "Hello..." }`
   - Response: `{ messageId: "...", providerMessageSid: "SM...", hasPolicyViolation: false }`
3. **Twilio Console** → Messaging → Logs
   - Filter by MessageSid from step 2
   - Screenshot showing:
     - From: Front desk number E164 (e.g., `+15559876543`)
     - To: Test phone number
     - Status: "delivered" or "sent"
     - Body: "Hello, this is a test message"
4. **Database query result** (see queries below)
   - Message row with `providerMessageSid` matching Twilio MessageSid
   - Thread row showing one thread per org+client (no duplicates)

## Test 2: Inbound Webhook Flow

### Steps

1. **Send SMS to Front Desk Number**
   - From test phone, send SMS to front desk number
   - Message: "This is a test reply"

2. **Verify Webhook Receives Request**
   - Check server logs for: `[Inbound Webhook] Received`
   - **Expected log:**
     ```
     [Inbound Webhook] Received {
       messageSid: 'SM...',
       from: '+15551234567',
       to: '+15559876543',
       bodyLength: 20
     }
     ```

3. **Verify Signature Validation**
   - Check logs for: `[Inbound Webhook] Resolved orgId`
   - **Expected:** No "Invalid signature" errors

4. **Verify Thread Resolution**
   - Check logs for: `[Inbound Webhook] Message stored successfully`
   - **Expected log:**
     ```
     [Inbound Webhook] Message stored successfully {
       messageId: '...',
       threadId: '...',
       orgId: '...',
       clientId: '...',
       from: '+15551234567',
       to: '+15559876543',
       messageSid: 'SM...'
     }
     ```

5. **Verify Message Appears in UI**
   - Refresh owner inbox
   - **Expected:** New message appears in thread list
   - Click thread to view messages
   - **Expected:** Inbound message visible with correct timestamp

6. **Verify Database**
   ```sql
   -- Find inbound message
   SELECT id, "threadId", direction, "senderType", body, "providerMessageSid"
   FROM "Message"
   WHERE direction = 'inbound'
   ORDER BY "createdAt" DESC
   LIMIT 1;

   -- Verify thread activity updated
   SELECT id, "lastActivityAt"
   FROM "Thread"
   WHERE id = '...' -- Use threadId from step 4
   ORDER BY "lastActivityAt" DESC;
   -- Expected: lastActivityAt updated to recent timestamp
   ```

### Screenshots Required

1. Server logs showing webhook receipt and processing
2. Owner inbox UI showing new inbound message
3. Database query showing inbound message with correct threadId

## Test 3: Routing - Sitter Masked Number During Active Window

### Prerequisites

- Create a booking with assignment window
- Assign sitter to booking
- Ensure sitter has assigned masked number

### Steps

1. **Verify Assignment Window Active**
   ```sql
   SELECT id, "threadId", "sitterId", "startsAt", "endsAt"
   FROM "AssignmentWindow"
   WHERE "sitterId" = '...' -- Use sitter ID
   AND "startsAt" <= NOW()
   AND "endsAt" >= NOW();
   -- Expected: At least one active window
   ```

2. **Send Message from Owner Inbox**
   - Navigate to thread for assigned client
   - Send message: "Test message during active window"

3. **Verify Routing Decision**
   - Check server logs for: `[Send Message] Routing decision`
   - **Expected log:**
     ```
     [Send Message] Routing decision {
       orgId: '...',
       threadId: '...',
       chosenNumberId: '...',
       chosenE164: '+1555...', -- Sitter masked number
       numberClass: 'sitter',
       windowId: '...',
       reason: 'Active assignment window for sitter ...'
     }
     ```

4. **Verify Twilio Send**
   - Check logs for: `[Send Message] Twilio send result`
   - **Expected:** `success: true, messageSid: 'SM...'`
   - Verify in Twilio Console:
     - From: Sitter masked number E164
     - To: Client phone number

5. **Verify Database**
   ```sql
   -- Verify from number is sitter masked number
   SELECT m.id, m."providerMessageSid", mn.e164, mn.class
   FROM "Message" m
   JOIN "MessageNumber" mn ON m."fromNumberId" = mn.id
   WHERE m."providerMessageSid" = 'SM...' -- Use MessageSid from step 4
   AND mn.class = 'sitter';
   -- Expected: 1 row with sitter masked number
   ```

### Screenshots Required

1. Server logs showing routing decision with `numberClass: 'sitter'`
2. Twilio Console showing From = sitter masked number
3. Database query showing `fromNumberId` = sitter masked number

## Test 4: Sitter Inbox - Send During Active Window

### Steps

1. **Navigate to Sitter Inbox**
   - Log in as sitter
   - Navigate to `/sitter/inbox`

2. **Verify Thread List**
   - **Expected:** Only threads with active assignment windows visible
   - Each thread shows:
     - Client name
     - Window status: "✓ Active" or "Inactive"
     - Assigned masked number (not client E164)

3. **Send Message During Active Window**
   - Select thread with active window
   - Type message: "Hello from sitter"
   - Click "Send"
   - **Expected:** Message sends successfully (200 response)

4. **Verify Window Check**
   - Check server logs for: `[Sitter Send] Routing decision`
   - **Expected:** No "WINDOW_NOT_ACTIVE" errors
   - Verify routing uses sitter masked number

5. **Verify Message in UI**
   - **Expected:** Outbound message appears in thread
   - Message shows "You" as sender
   - No client E164 visible anywhere

### Screenshots Required

1. Sitter inbox showing thread list with active windows
2. Compose box enabled (not blocked)
3. Message sent successfully in UI
4. Server logs showing successful send with sitter number

## Test 5: Sitter Inbox - Blocked Outside Window

### Steps

1. **Wait for Window to Expire OR Use Thread with Expired Window**
   - Select thread where assignment window has ended

2. **Verify Compose Box Blocked**
   - **Expected:** Compose box shows warning:
     ```
     Cannot send messages
     Your assignment window is not currently active. Messages can only be sent during active assignment windows.
     ```
   - Textarea and Send button should be disabled/hidden

3. **Attempt Send via API (if possible)**
   - Use curl or Postman to send:
     ```bash
     curl -X POST https://[domain]/api/sitter/threads/[threadId]/messages \
       -H "Cookie: [session]" \
       -H "Content-Type: application/json" \
       -d '{"body": "Test"}'
     ```
   - **Expected:** 403 response with:
     ```json
     {
       "error": "Assignment window is not active. Messages can only be sent during active assignment windows.",
       "code": "WINDOW_NOT_ACTIVE",
       "windowStartsAt": "...",
       "windowEndsAt": "..."
     }
     ```

### Screenshots Required

1. Sitter inbox showing blocked compose box
2. API response showing 403 with WINDOW_NOT_ACTIVE code

## Test 6: Routing Trace Storage

### Steps

1. **Send Message from Any Source**
   - Owner inbox, sitter inbox, or automation

2. **Check Server Logs for Routing Trace**
   - Look for: `[chooseFromNumber]` or `[Send Message] Routing decision`
   - **Expected:** Log includes `routingTrace` array with steps:
     ```json
     {
       "routingTrace": [
         {
           "step": 1,
           "rule": "Active assignment window with sitter",
           "condition": "...",
           "result": true/false,
           "explanation": "..."
         }
       ]
     }
     ```

3. **Verify Routing Decision Logged**
   - All sends should log:
     - `chosenNumberId`
     - `chosenE164`
     - `numberClass`
     - `windowId` (if applicable)
     - `reason`

### Screenshots Required

1. Server logs showing routing trace for owner send
2. Server logs showing routing trace for sitter send (with windowId)

## Verification Checklist

- [ ] Owner "Message Anyone" creates thread and sends via front_desk number
- [ ] Inbound webhook validates signature and resolves thread correctly
- [ ] Routing selects sitter masked number during active assignment window
- [ ] Routing selects front_desk/pool number when no active window
- [ ] Sitter inbox shows only threads with active windows
- [ ] Sitter inbox blocks sends outside active window (403)
- [ ] All sends use `chooseFromNumber()` function
- [ ] All sends log routing decision with trace
- [ ] Twilio Console shows correct From numbers
- [ ] Database stores correct `fromNumberId` and `providerMessageSid`
- [ ] No client E164 exposed to sitter in UI or API responses

## Common Issues

### Issue: 500 Error on `/api/messages/threads`
- **Check:** Server logs for Prisma errors
- **Fix:** Verify database schema matches Prisma schema

### Issue: Webhook Returns 200 but Message Not Stored
- **Check:** Server logs for "Message stored successfully"
- **Fix:** Verify thread resolution logic and database constraints

### Issue: Wrong From Number in Twilio
- **Check:** Server logs for routing decision
- **Fix:** Verify `chooseFromNumber()` is called and returns correct number

### Issue: Sitter Can Send Outside Window
- **Check:** Server logs for window validation
- **Fix:** Verify `AssignmentWindow` query includes time checks

## Database Queries for Verification

```sql
-- Verify unique index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ClientContact'
AND indexdef LIKE '%orgId_e164%';
-- Expected: UNIQUE index on (orgId, e164)

-- Verify no duplicate threads per org+client
SELECT "orgId", "clientId", COUNT(*) as count
FROM "Thread"
GROUP BY "orgId", "clientId"
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Verify routing decisions (check recent messages)
SELECT 
  m.id,
  m."providerMessageSid",
  m.direction,
  m."senderType",
  mn.e164 as from_e164,
  mn.class as from_class,
  t."threadType"
FROM "Message" m
JOIN "MessageNumber" mn ON m."fromNumberId" = mn.id
JOIN "Thread" t ON m."threadId" = t.id
ORDER BY m."createdAt" DESC
LIMIT 10;
```
