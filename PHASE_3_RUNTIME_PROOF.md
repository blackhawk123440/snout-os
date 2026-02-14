# Phase 3 Runtime Proof

**Phase 3: Booking Confirmed → Thread + Masking Number + Windows + Automations**

## Overview

This document provides step-by-step instructions to verify Phase 3 implementation in runtime.

## Prerequisites

1. Database seeded with:
   - At least one organization
   - At least one owner user
   - At least one sitter user
   - At least one client
   - At least one messaging number (pool or front_desk)

2. Twilio configured (or mock provider)

## Step 1: Trigger Booking Confirmation

### Option A: Stripe Webhook (Production)

1. Use Stripe CLI to send test webhook:
   ```bash
   stripe trigger payment_intent.succeeded \
     --override payment_intent:metadata[bookingId]=<booking-id>
   ```

2. Or use API simulation:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{
       "type": "payment_intent.succeeded",
       "data": {
         "object": {
           "id": "pi_test",
           "amount": 10000,
           "metadata": {
             "bookingId": "<booking-id>"
           }
         }
       }
     }'
   ```

### Option B: Manual Status Update (Testing)

1. Create booking via API:
   ```bash
   curl -X POST http://localhost:3000/api/bookings \
     -H "Content-Type: application/json" \
     -H "Cookie: <session-cookie>" \
     -d '{
       "firstName": "Test",
       "lastName": "Client",
       "phone": "+15551234567",
       "service": "dog_walking",
       "startAt": "2024-12-31T10:00:00Z",
       "endAt": "2024-12-31T11:00:00Z"
     }'
   ```

2. Update booking status to confirmed:
   ```bash
   curl -X PATCH http://localhost:3000/api/bookings/<booking-id> \
     -H "Content-Type: application/json" \
     -H "Cookie: <session-cookie>" \
     -d '{"status": "confirmed"}'
   ```

## Step 2: Verify Database Records

### Expected Records Created

1. **MessageThread** (one per booking, idempotent):
   ```sql
   SELECT * FROM "MessageThread" 
   WHERE "bookingId" = '<booking-id>' 
   AND "scope" = 'client_booking';
   ```
   - Should return exactly 1 row
   - `messageNumberId` should be set
   - `numberClass` should be set (pool/sitter/front_desk)

2. **AssignmentWindow** (one per booking, idempotent):
   ```sql
   SELECT * FROM "AssignmentWindow" 
   WHERE "bookingId" = '<booking-id>';
   ```
   - Should return exactly 1 row
   - `startsAt` = booking.startAt
   - `endsAt` = booking.endAt + 60 minutes (grace period)

3. **EventLog** (audit events):
   ```sql
   SELECT * FROM "EventLog" 
   WHERE "bookingId" = '<booking-id>' 
   AND "eventType" = 'booking.confirmed.processed';
   ```
   - Should return at least 1 row
   - `status` = 'success'
   - `metadata` contains correlationId = bookingId

## Step 3: Verify UI

### Owner Inbox (`/messages`)

1. Navigate to `/messages`
2. **Expected**: Thread appears in thread list
3. **Expected**: Thread shows:
   - Client name
   - Number class badge (Pool/Sitter/Front Desk)
   - Assignment window indicator (if active)
   - Last message timestamp

4. Click thread to select
5. **Expected**: Message panel shows:
   - Thread details
   - Assignment window status
   - Number class badge

### Assignments Tab (`/messages?tab=assignments`)

1. Navigate to `/messages?tab=assignments`
2. **Expected**: Assignment window appears in list
3. **Expected**: Window shows:
   - Booking reference
   - Start/end times
   - Sitter assignment (if assigned)
   - Status (Active/Future/Past)

### Numbers Tab (`/messages?tab=numbers`)

1. Navigate to `/messages?tab=numbers`
2. **Expected**: Thread's assigned number shows:
   - Status: "In use"
   - Thread reference
   - Number class

### Automation Logs

1. Navigate to `/settings/automations/ledger`
2. **Expected**: Automation run appears:
   - Type: `bookingConfirmation`
   - Recipient: `client`
   - Status: `success`
   - **Critical**: `fromNumber` equals thread's `messageNumberId`

## Step 4: Verify Sitter Dashboard

### Sitter Dashboard (`/sitter`)

1. Logout as owner
2. Login as sitter
3. Navigate to `/sitter`
4. **Expected**: Dashboard shows:
   - Inbox card with active conversations count
   - Link to `/sitter/inbox`
   - Today's Assignments list
   - Your business number (masked)
   - Messaging status: "You can message only during assignment windows"

### Sitter Inbox (`/sitter/inbox`)

1. Navigate to `/sitter/inbox`
2. **Expected**: Only threads with active assignment windows appear
3. **Expected**: Compose is:
   - Enabled during active window
   - Disabled outside window (with explanation)
4. **Expected**: Client E164 is never shown (only masked number)

## Step 5: Verify Network Calls

### Expected API Calls

1. **Booking Confirmation**:
   - `POST /api/webhooks/stripe` → 200
   - `POST /api/bookings/<id>/confirm` (if manual) → 200

2. **Thread Creation**:
   - `GET /api/messages/threads` → 200
   - Response includes thread with `messageNumberId` and `numberClass`

3. **Window Creation**:
   - `GET /api/assignments/windows?bookingId=<id>` → 200
   - Response includes window with correct start/end times

4. **Automation Send**:
   - `POST /api/messages/threads/<thread-id>/messages` → 200
   - Request body: `{ body: "...", forceSend: false }`
   - **Critical**: Message sent from thread's masking number (verified in Twilio logs)

5. **Sitter Access**:
   - `GET /api/sitter/threads` → 200
   - Response filtered to active windows only

## Step 6: Idempotency Verification

### Test: Confirm Booking Twice

1. Confirm booking via webhook or API
2. Confirm same booking again (same bookingId)
3. **Expected**: Only ONE thread created
4. **Expected**: Only ONE assignment window created/updated
5. **Expected**: Number assignment is deterministic (same number assigned)

### Test: Multiple Webhook Deliveries

1. Send Stripe webhook 3 times with same bookingId
2. **Expected**: Only ONE thread created
3. **Expected**: EventLog shows 3 webhook events but only 1 thread creation

## Step 7: Automation Binding Verification

### Verify Automation Uses Thread Number

1. Check automation execution logs
2. **Expected**: `sendAutomationMessageViaThread` called
3. **Expected**: `usedThread: true` in metadata
4. **Expected**: Message sent via `/api/messages/threads/<thread-id>/messages`
5. **Expected**: Twilio logs show `from` number equals thread's `messageNumber.e164`

## Troubleshooting

### Thread Not Created

- Check EventLog for errors
- Verify booking has `clientId` and `orgId`
- Check database connection

### Number Not Assigned

- Verify messaging numbers exist in database
- Check number status (must be 'active')
- Verify orgId matches

### Window Not Created

- Check AssignmentWindow table
- Verify booking dates are valid
- Check for constraint violations

### Automation Not Using Thread

- Check automation executor logs
- Verify `sendAutomationMessageViaThread` is called
- Check for fallback warnings in EventLog

## Success Criteria

✅ Booking confirmed → thread created (idempotent)  
✅ Thread has masking number assigned  
✅ Assignment window created (idempotent)  
✅ Automation sends from thread masking number  
✅ Sitter dashboard shows active windows  
✅ Sitter can only message during active windows  
✅ All actions audited in EventLog  
✅ Routing trace explains "Why routed here?"

## Files Changed

- `src/lib/bookings/booking-confirmed-handler.ts` - Main handler
- `src/lib/bookings/automation-thread-sender.ts` - Thread-aware sender
- `src/lib/bookings/booking-status-helper.ts` - Status update helper
- `src/app/api/webhooks/stripe/route.ts` - Webhook integration
- `src/lib/automation-executor.ts` - Updated all client sends
- `src/app/sitter/page.tsx` - Sitter dashboard
- `tests/e2e/phase3-booking-confirmed.spec.ts` - Integration tests
