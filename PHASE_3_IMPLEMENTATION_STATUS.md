# Phase 3 Implementation Status

**Phase 3: Booking Confirmed → Thread + Masking Number + Windows + Automations**

## ✅ Completed

### 1. Booking Confirmed Handler
**File:** `src/lib/bookings/booking-confirmed-handler.ts`

- ✅ Idempotent `onBookingConfirmed()` entrypoint
- ✅ A) Create or reuse thread (key: {orgId, clientId, bookingId})
- ✅ B) Select & assign masking number (sitter → pool → front_desk)
- ✅ C) Create assignment window with grace period
- ✅ D) Emit audit events (EventLog)
- ✅ All operations are idempotent (safe to call multiple times)

### 2. Automation Thread Sender
**File:** `src/lib/bookings/automation-thread-sender.ts`

- ✅ `sendAutomationMessageViaThread()` function
- ✅ Finds thread for booking
- ✅ Sends via messaging API using thread's masking number
- ✅ Falls back to old sendMessage if thread not found (backward compatibility)

### 3. Automation Executor Integration
**File:** `src/lib/automation-executor.ts`

- ✅ Updated `executeBookingConfirmation()` to use thread sender
- ✅ Sends from thread masking number instead of random number
- ⏳ Need to update other automation functions (nightBeforeReminder, etc.)

## ⏳ In Progress

### 4. Stripe Webhook Integration
**Status:** Need to locate webhook file

- ⏳ Integrate `onBookingConfirmed()` into payment success handler
- ⏳ Call handler when booking status changes to "confirmed"

### 5. Sitter Dashboard
**Status:** Not started

- ⏳ Create `/sitter` dashboard route
- ⏳ Show active windows
- ⏳ Show today's windows list
- ⏳ Alerts for blocked outside window, policy violations
- ⏳ Compose disabled outside window with explanation
- ⏳ Never show client real E164

### 6. Integration Tests
**Status:** Not started

- ⏳ Test: Booking confirmed twice → no duplicate threads
- ⏳ Test: Booking confirmed twice → no duplicate windows
- ⏳ Test: Booking confirmed twice → number assignment is deterministic
- ⏳ Test: Automation send uses thread.messageNumberId
- ⏳ Test: Pool leakage safety (inbound from unknown sender → owner inbox)
- ⏳ Test: Window enforcement (sitter blocked outside window)

### 7. Proof Documentation
**Status:** Not started

- ⏳ Create `PHASE_3_RUNTIME_PROOF.md`
- ⏳ Steps to confirm booking
- ⏳ Expected thread creation + masking number + window + automation send

## 🔧 Technical Notes

### Thread Key Structure
- Key: `{orgId, clientId, bookingId}`
- Scope: `'client_booking'`
- Idempotent: Reuses existing thread if found

### Number Assignment Rules
1. If sitter assigned → use sitter's dedicated number
2. Else → try pool number (least recently used)
3. Else → fallback to front desk
4. Error if no numbers available

### Assignment Window
- `startsAt` = booking.startAt
- `endsAt` = booking.endAt + 60 minutes (grace period)
- Idempotent: Updates existing window if found

### Automation Sending
- Finds thread by bookingId
- Uses thread's `messageNumberId` (masking number)
- Falls back to old `sendMessage()` if thread not found
- All automations should eventually use thread sender

## Next Steps

1. **Locate and integrate Stripe webhook** - Call `onBookingConfirmed()` when payment succeeds
2. **Update remaining automation functions** - Replace all `sendMessage()` calls with `sendAutomationMessageViaThread()`
3. **Create sitter dashboard** - `/sitter` route with active windows, compose restrictions
4. **Add integration tests** - Idempotency and invariant tests
5. **Create proof documentation** - Runtime verification steps

## Files Created

- `src/lib/bookings/booking-confirmed-handler.ts` ✅
- `src/lib/bookings/automation-thread-sender.ts` ✅

## Files Modified

- `src/lib/automation-executor.ts` ✅ (partial - only bookingConfirmation updated)
