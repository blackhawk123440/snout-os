# ONE THREAD PER CLIENT Implementation Summary

## Commit SHA
**08d1ae4** - "Implement ONE THREAD PER CLIENT architecture"

## Migration
**Name:** `20260129000000_one_thread_per_client`

**What Changed:**
- Added unique constraint `@@unique([orgId, clientId])` on `Thread` model
- Enforces one thread per client per organization at database level
- Migration includes duplicate detection and warning

## Updated Documentation Files
1. **NUMBER_ASSIGNMENT_EXPLAINED.md** - Complete rewrite:
   - Changed from "multiple threads per client" to "one thread per client"
   - Updated to reflect persistent sitter number assignment
   - Added dynamic number routing explanation
   - Updated flow diagrams

2. **PHASE_3_RUNTIME_PROOF.md** - Updated:
   - Changed "MessageThread (one per booking)" to "Thread (one per client per org)"
   - Updated assignment window description

## Behavior Before vs Behavior Now

### Before ❌
- **Thread Creation:** One thread per booking (`{orgId, clientId, bookingId}`)
- **Sitter Number Assignment:** Assigned per booking when sitter assigned
- **Number Selection:** Fixed at thread creation time
- **UI Copy:** "Masking numbers are assigned automatically when a sitter is assigned to a booking"
- **Documentation:** "Client can have multiple threads with different numbers"

### Now ✅
- **Thread Creation:** One thread per client per org (`{orgId, clientId}` only)
- **Sitter Number Assignment:** Persistent - assigned on sitter activation, reused across all bookings
- **Number Selection:** Dynamic at send-time based on active assignment windows
- **UI Copy:** "Sitters receive a dedicated masked number when activated. This number persists across all bookings."
- **Documentation:** "Each client has exactly one conversation thread. Multiple bookings create multiple assignment windows within the same thread."

## Code Changes Summary

### Database Schema
- `enterprise-messaging-dashboard/apps/api/prisma/schema.prisma`
  - Added `@@unique([orgId, clientId])` to Thread model

### Core Logic
- `src/lib/bookings/booking-confirmed-handler.ts`
  - `findOrCreateThread()` now uses `(orgId, clientId)` only
  - Removed `bookingId` from thread key
  - `determineInitialThreadNumber()` replaces `assignMaskingNumberToThread()`
  - Number is just initial default - actual number computed dynamically

- `src/lib/messaging/dynamic-number-routing.ts` (NEW)
  - `getEffectiveNumberForThread()` computes number at send-time
  - Priority: Active window with sitter → sitter number, else pool, else front desk

- `enterprise-messaging-dashboard/apps/api/src/messaging/messaging.service.ts`
  - Updated to use dynamic number routing
  - Checks active assignment windows at send-time

### Sitter Activation
- `src/app/api/sitters/route.ts` (POST)
  - Assigns sitter number when creating active sitter

- `src/app/api/sitters/[id]/route.ts` (PATCH)
  - Assigns sitter number when activating sitter
  - Number persists - not reassigned per booking

### Quarantine Improvements
- `src/app/api/numbers/[id]/quarantine/route.ts`
  - Added support for duration selector: '1' | '3' | '7' | '14' | '30' | '90' | 'custom'
  - Maps duration to `durationDays`
  - Default remains 90 days

- `src/app/api/numbers/[id]/release/route.ts`
  - Added validation: `restoreReason` required when `forceRestore: true`
  - Supports immediate restore with audit reason

### UI Copy Updates
- `src/app/bookings/sitters/page.tsx`
  - Updated info text to reflect persistent sitter numbers

- `src/app/sitter/page.tsx`
  - Updated business number description

- `src/app/api/webhooks/stripe/route.ts`
  - Updated log message

## Tests Added

1. **`src/lib/messaging/__tests__/one-thread-per-client.test.ts`**
   - Proves: Same client + multiple confirmed bookings → one thread
   - Tests unique constraint enforcement

2. **`src/lib/messaging/__tests__/persistent-sitter-number.test.ts`**
   - Proves: Sitter activation assigns number once
   - Proves: Booking confirm does not reassign sitter number
   - Number persists across multiple bookings

## Test Output

Run tests with:
```bash
pnpm test src/lib/messaging/__tests__/one-thread-per-client.test.ts
pnpm test src/lib/messaging/__tests__/persistent-sitter-number.test.ts
```

## Quick Sanity Check

After this implementation, you should be able to:

✅ **Confirm booking for same client 5 times → still 1 thread in Messages**
- Check: `/messages` → Inbox → Should see one thread per client
- Database: `SELECT COUNT(*) FROM "Thread" WHERE "clientId" = '<client-id>'` → Should return 1

✅ **Sitter activated → gets masked number and keeps it**
- Check: Activate sitter → Check `MessageNumber.assignedSitterId`
- Confirm multiple bookings → Same number used (not reassigned)

✅ **Active booking window → messages send from sitter number**
- Check: Send message during active window → Verify `fromE164` is sitter's number
- Check routing trace: Should show "Active assignment window for sitter X"

✅ **Booking ends → routing falls back; number behavior is explainable**
- Check: Send message outside window → Should use pool or front desk
- Check routing trace: Should show "No active window - using pool/front desk"

✅ **Quarantine modal lets me choose duration; Restore Now actually restores**
- Check: Quarantine number → Should see duration selector (1/3/7/14/30/90/custom)
- Check: Restore Now → Should require reason, should restore immediately
- Check audit log: Should show `forceRestore: true` and `restoreReason`

## Files Changed (16 files)

1. `enterprise-messaging-dashboard/apps/api/prisma/schema.prisma`
2. `enterprise-messaging-dashboard/apps/api/prisma/migrations/20260129000000_one_thread_per_client/migration.sql`
3. `src/lib/bookings/booking-confirmed-handler.ts`
4. `src/lib/messaging/dynamic-number-routing.ts` (NEW)
5. `enterprise-messaging-dashboard/apps/api/src/messaging/messaging.service.ts`
6. `src/app/api/sitters/route.ts`
7. `src/app/api/sitters/[id]/route.ts`
8. `src/app/api/numbers/[id]/quarantine/route.ts`
9. `src/app/api/numbers/[id]/release/route.ts`
10. `src/app/bookings/sitters/page.tsx`
11. `src/app/sitter/page.tsx`
12. `src/app/api/webhooks/stripe/route.ts`
13. `NUMBER_ASSIGNMENT_EXPLAINED.md`
14. `PHASE_3_RUNTIME_PROOF.md`
15. `src/lib/messaging/__tests__/one-thread-per-client.test.ts` (NEW)
16. `src/lib/messaging/__tests__/persistent-sitter-number.test.ts` (NEW)
