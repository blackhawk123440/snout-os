# Phase 1.2 Acceptance Checks: Number Assignment Logic

## Status: ✅ Complete - Ready for Review

**Date:** 2026-01-19  
**Phase:** 1.2 - Number Assignment Logic (Front Desk, Sitter Masked, Pool Numbers)

---

## Implementation Summary

### Core Functions Implemented

1. **`getOrCreateFrontDeskNumber`**
   - Returns existing Front Desk number or throws error (requires manual setup)
   - Enforces one Front Desk number per org

2. **`assignSitterMaskedNumber`**
   - Assigns dedicated masked number to sitter
   - Returns existing active masked number if available
   - **Guardrail:** Does not reuse deactivated sitter numbers for new sitters (90-day cooldown enforced)
   - Converts deactivated sitter numbers to pool after cooldown

3. **`getPoolNumber`**
   - Selects pool number from rotating pool
   - Prefers numbers not recently assigned (30-day preference)
   - Can reuse immediately if pool is tight (routing safeguard prevents leakage)

4. **`determineThreadNumberClass`**
   - Determines appropriate number class based on thread context
   - Rules:
     - Meet-and-greet → Front Desk
     - One-time client → Pool
     - Assigned sitter → Sitter masked
     - Default → Front Desk

5. **`assignNumberToThread`**
   - Assigns number to thread based on number class
   - **Critical Guardrail:** `thread.numberClass` always derives from `MessageNumber.numberClass`, never drifts independently
   - Updates thread with `messageNumberId`, `numberClass`, and `maskedNumberE164`

6. **`validatePoolNumberRouting`**
   - Validates sender is mapped to active thread on pool number
   - **Guardrail:** If sender not mapped, must route to owner + auto-response
   - Prevents leakage between different clients using same pool number

---

## Acceptance Criteria

### ✅ Guardrail 1: Sitter Masked Number Reassignment Prevention

**Requirement:** Sitter masked numbers must not be reassigned to another sitter after offboarding; enforce cooldown and recycle only as pool later.

**Implementation:**
- `assignSitterMaskedNumber` checks for deactivated numbers
- If found after 90-day cooldown, converts to pool (never reuses as sitter number)
- Creates new sitter number instead of reusing old one

**Test:** `src/lib/messaging/__tests__/number-helpers.test.ts`
- ✅ `assignSitterMaskedNumber` - "should not reuse deactivated sitter numbers for new sitters"

**Verification:**
```typescript
// Test verifies that deactivated sitter number is converted to pool
// and new sitter number assignment throws error (no new number available)
```

---

### ✅ Guardrail 2: Number Class Derivation

**Requirement:** `MessageThread.numberClass` must always derive from its assigned `MessageNumber`, not drift independently.

**Implementation:**
- `assignNumberToThread` reads `MessageNumber.numberClass` after assignment
- Sets `thread.numberClass = messageNumber.numberClass` (not the parameter)
- Validates number class matches before updating thread

**Test:** `src/lib/messaging/__tests__/number-helpers.test.ts`
- ✅ `assignNumberToThread` - "should ensure thread.numberClass matches MessageNumber.numberClass"

**Verification:**
```typescript
// Test verifies that thread.numberClass is set to MessageNumber.numberClass
// not the passed parameter
expect(prisma.messageThread.update).toHaveBeenCalledWith({
  where: { id: 'thread-1' },
  data: {
    numberClass: 'sitter', // Derived from MessageNumber, not parameter
  },
});
```

---

### ✅ Guardrail 3: Pool Number Routing Validation

**Requirement:** Pool number inbound routing must validate sender identity before attaching to a thread; mismatches must route to owner + auto-response.

**Implementation:**
- `validatePoolNumberRouting` checks if sender is participant in active thread
- Returns `isValid: false` if sender not mapped
- Webhook handler validates pool number routing before processing message

**Test:** `src/lib/messaging/__tests__/number-helpers.test.ts`
- ✅ `validatePoolNumberRouting` - "should validate sender is mapped to active thread"
- ✅ `validatePoolNumberRouting` - "should reject sender not mapped to active thread"

**Verification:**
```typescript
// Test verifies routing validation logic
// If sender not mapped, returns isValid: false with reason
```

**Note:** Owner routing + auto-response implementation deferred to Phase 1.3 (log warning for now)

---

## Integration Points

### Webhook Handler Integration

**File:** `src/app/api/messages/webhook/twilio/route.ts`

1. **New Thread Creation:**
   - Determines number class via `determineThreadNumberClass`
   - Assigns number via `assignNumberToThread`
   - Handles assignment failures gracefully (doesn't block message storage)

2. **Existing Thread Validation:**
   - Validates pool number routing if thread uses pool number
   - Logs warning if routing mismatch (owner routing deferred to Phase 1.3)

---

## Test Coverage

**Test File:** `src/lib/messaging/__tests__/number-helpers.test.ts`

**Total Tests:** 12 ✅ All Passing

### Test Coverage:
- ✅ `getOrCreateFrontDeskNumber` - returns existing number
- ✅ `getOrCreateFrontDeskNumber` - throws if not configured
- ✅ `assignSitterMaskedNumber` - returns existing active number
- ✅ `assignSitterMaskedNumber` - does not reuse deactivated numbers
- ✅ `determineThreadNumberClass` - meet-and-greet → front_desk
- ✅ `determineThreadNumberClass` - one-time client → pool
- ✅ `determineThreadNumberClass` - assigned sitter → sitter
- ✅ `determineThreadNumberClass` - default → front_desk
- ✅ `assignNumberToThread` - assigns Front Desk number
- ✅ `assignNumberToThread` - ensures number class derivation
- ✅ `validatePoolNumberRouting` - validates mapped sender
- ✅ `validatePoolNumberRouting` - rejects unmapped sender

---

## Known Limitations

1. **Number Provisioning:** Currently requires manual `MessageNumber` creation. In production, would integrate with provider API to purchase/provision numbers automatically.

2. **Owner Routing:** Pool number routing mismatch currently logs warning. Full owner routing + auto-response deferred to Phase 1.3.

3. **Sitter Offboarding:** Number deactivation logic not yet integrated with sitter offboarding workflow. Will be added in Phase 1.3.

4. **One-Time Client Classification:** `isOneTimeClient` flag currently defaults to `false`. Client classification logic deferred to Phase 1.3.

---

## Next Steps

**Phase 1.3:** Thread-number association and routing logic
- Complete owner routing + auto-response for pool number mismatches
- Integrate sitter offboarding with number deactivation
- Implement client classification logic
- Add migration scripts for existing data

---

## Approval Checklist

- [x] Guardrail 1: Sitter masked numbers not reassigned after offboarding
- [x] Guardrail 2: Thread.numberClass derives from MessageNumber.numberClass
- [x] Guardrail 3: Pool number routing validates sender identity
- [x] All unit tests passing (12/12)
- [x] Integration with webhook handler complete
- [x] Error handling graceful (doesn't block message storage)
- [x] Documentation complete

**Status:** ✅ Ready for Approval
