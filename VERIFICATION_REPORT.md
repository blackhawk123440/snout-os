# Verification Report: ONE THREAD PER CLIENT Architecture

## 1️⃣ Thread Model Verification

### ✅ PASS

**Database Constraint:**
```prisma
// enterprise-messaging-dashboard/apps/api/prisma/schema.prisma:165
@@unique([orgId, clientId]) // Enforce: one thread per client per org
```

**Migration:**
- File: `enterprise-messaging-dashboard/apps/api/prisma/migrations/20260129000000_one_thread_per_client/migration.sql`
- Creates unique index: `CREATE UNIQUE INDEX IF NOT EXISTS "Thread_orgId_clientId_key" ON "Thread"("orgId", "clientId");`

**Code Verification:**
- `src/lib/bookings/booking-confirmed-handler.ts:108-184`
  - `findOrCreateThread()` uses only `(orgId, clientId)` - NO bookingId
  - Uses `findUnique` with `orgId_clientId` composite key
  - No code path creates thread using bookingId

**Test:**
- `src/lib/messaging/__tests__/one-thread-per-client.test.ts`
  - Proves: 5 bookings for same client → still 1 thread
  - Tests unique constraint enforcement

---

## 2️⃣ Sitter Number Persistence Verification

### ✅ PASS

**Assignment Location:**
- `src/app/api/sitters/route.ts:163-171` - Assigns on sitter creation (if active)
- `src/app/api/sitters/[id]/route.ts:142-155` - Assigns on sitter activation
- Function: `assignSitterMaskedNumber()` in `src/lib/messaging/number-helpers.ts:64-119`

**Booking Logic Verification:**
- `src/lib/bookings/booking-confirmed-handler.ts:196-268`
  - `determineInitialThreadNumber()` only LOOKS UP existing sitter numbers
  - Does NOT call `assignSitterMaskedNumber()`
  - Does NOT reassign sitter numbers per booking

**UI Copy Verification:**
- `src/app/bookings/sitters/page.tsx:747` - ✅ Correct: "Sitters receive a dedicated masked number when activated... persists across all bookings"
- `src/app/sitter/page.tsx:145` - ✅ Correct: "assigned when you were activated. It persists across all bookings"

**Test:**
- `src/lib/messaging/__tests__/persistent-sitter-number.test.ts`
  - Proves: booking confirmed does not reassign sitter number

---

## 3️⃣ Routing-Based Masking Verification

### ✅ PASS

**Dynamic Routing Implementation:**
- `enterprise-messaging-dashboard/apps/api/src/messaging/messaging.service.ts:130-151`
  - Computes `fromE164` dynamically at send-time based on active windows
  - Priority: Active window with sitter → sitter number, else thread default
  - ✅ Number is chosen at send-time, not stored statically
  - ✅ Routing logic matches requirements

**Frontend Helper Function:**
- `src/lib/messaging/dynamic-number-routing.ts:36-173`
  - `getEffectiveNumberForThread()` exists for frontend use
  - Backend implements equivalent logic inline (functionally correct)

**Thread.numberId Updates:**
- `src/lib/bookings/booking-confirmed-handler.ts:256-262`
  - Updates thread.numberId only during initial thread creation
  - Comment states: "this is just a default - routing will override"
  - ✅ NOT permanently overwritten per booking
  - ✅ Actual number used is computed dynamically at send-time

---

## 4️⃣ Quarantine & Restore Verification

### ✅ PASS

**API Handler:**
- `enterprise-messaging-dashboard/apps/api/src/numbers/numbers.service.ts:207-278`
  - `quarantineNumber()` accepts: `durationDays`, `customReleaseDate`
  - Priority: customReleaseDate > durationDays > default 90 days

- `enterprise-messaging-dashboard/apps/api/src/numbers/numbers.service.ts:280-331`
  - `releaseFromQuarantine()` accepts: `forceRestore`, `restoreReason`
  - ✅ Bypasses cooldown if `forceRestore: true`
  - ✅ Creates audit event with restoreReason

**BFF Proxy:**
- `src/app/api/numbers/[id]/quarantine/route.ts:55-87`
  - ✅ Accepts `duration` selector: '1' | '3' | '7' | '14' | '30' | '90' | 'custom'
  - ✅ Maps to `durationDays` or `customReleaseDate`

- `src/app/api/numbers/[id]/release/route.ts:54-72`
  - ✅ Accepts `forceRestore` and `restoreReason`
  - ✅ Validates: restoreReason required when forceRestore is true

**UI Component:**
- `src/components/messaging/NumbersPanelContent.tsx:252-813`
  - ✅ Shows duration selector
  - ✅ Shows "Restore Now" button with reason input
  - ✅ Disables restore if reason missing when forceRestore=true

---

## 5️⃣ Documentation Correction

### ✅ PASS

**NUMBER_ASSIGNMENT_EXPLAINED.md:**
- ✅ Line 5: "ONE THREAD PER CLIENT PER ORG"
- ✅ Line 7: "Each client has exactly one conversation thread"
- ✅ Line 22: "NOT per-booking - the same number is used for all bookings"
- ✅ Line 40: "The number used is computed at send-time, not stored statically"

**UI Copy:**
- ✅ `src/app/bookings/sitters/page.tsx:747` - Correct
- ✅ `src/app/sitter/page.tsx:145` - Correct

**Removed Incorrect Statements:**
- ❌ "Client can have multiple threads" - REMOVED
- ❌ "Masking happens when sitter assigned to booking" - REMOVED

---

## 6️⃣ Tests

### ✅ PASS (After Fixes)

**Test Files:**
1. `src/lib/messaging/__tests__/one-thread-per-client.test.ts` - ✅ PASSES
   - Proves: Same client + multiple bookings → one thread
   - Proves: Unique constraint enforcement

2. `src/lib/messaging/__tests__/persistent-sitter-number.test.ts` - ✅ PASSES
   - Proves: Sitter activation assigns number once
   - Proves: Booking confirmed does not reassign sitter number

**Test Coverage:**
- ✅ One thread per client invariant
- ✅ Sitter number persistence across bookings
- ✅ Unique constraint enforcement

---

## 7️⃣ Issues Found & Fixes Required

### ✅ ALL ISSUES RESOLVED

**No blocking issues found.** All verification criteria met:
- ✅ Thread model enforces one thread per client
- ✅ Sitter numbers are persistent
- ✅ Routing is dynamic at send-time
- ✅ Quarantine is configurable with restore-now
- ✅ Documentation matches truth
- ✅ Tests pass

---

## Summary

**PASS:** Thread model, Sitter persistence, Routing-based masking, Quarantine, Documentation, Tests

**Commit SHA:** `a90e9bd` (latest fixes)

**Files Changed:**
- `enterprise-messaging-dashboard/apps/api/prisma/schema.prisma`
- `src/lib/bookings/booking-confirmed-handler.ts`
- `src/lib/messaging/dynamic-number-routing.ts` (NEW)
- `src/app/api/sitters/route.ts`
- `src/app/api/sitters/[id]/route.ts`
- `src/app/api/numbers/[id]/quarantine/route.ts`
- `src/app/api/numbers/[id]/release/route.ts`
- `src/app/bookings/sitters/page.tsx`
- `src/app/sitter/page.tsx`
- `NUMBER_ASSIGNMENT_EXPLAINED.md`
- `src/lib/messaging/__tests__/one-thread-per-client.test.ts` (NEW)
- `src/lib/messaging/__tests__/persistent-sitter-number.test.ts` (NEW)

**Before vs After:**
Before: Multiple threads per client (one per booking), sitter numbers assigned per booking, fixed number at thread creation, 90-day quarantine lockout with no override. After: One thread per client (enforced by DB constraint), sitter numbers persistent (assigned on activation), dynamic number routing at send-time based on active windows, configurable quarantine duration with restore-now override.
