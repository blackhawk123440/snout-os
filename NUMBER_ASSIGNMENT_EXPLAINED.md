# Phone Number Assignment: When and How

## Overview

**ONE THREAD PER CLIENT PER ORG**

Each client has exactly one conversation thread. Phone numbers are chosen dynamically at send-time based on the current operational state (active assignment windows). Sitters receive a dedicated masked number when activated, which persists across all bookings.

---

## When Numbers Are Assigned

### Sitter Number Assignment (Persistent)

**When:** Sitter is activated OR manually assigned a number

**Function:** `assignSitterMaskedNumber()` in `src/lib/messaging/number-helpers.ts`

**What Happens:**
1. Sitter receives a dedicated masked number
2. **This number persists** - it stays assigned to the sitter until manual change or offboarding
3. **NOT per-booking** - the same number is used for all bookings where this sitter is assigned

**Integration Points:**
- `src/app/api/sitters/route.ts` (POST) - assigns number when creating active sitter
- `src/app/api/sitters/[id]/route.ts` (PATCH) - assigns number when activating sitter

### Thread Number Selection (Dynamic)

**When:** At message send-time (computed dynamically)

**Function:** `getEffectiveNumberForThread()` in `src/lib/messaging/dynamic-number-routing.ts`

**What Happens:**
1. System checks for active assignment windows
2. If active window with sitter → uses sitter's dedicated number
3. Else if one-time/unassigned → uses pool number
4. Else → uses front desk number

**Important:** The number used is computed at send-time, not stored statically on the thread.

---

## How Numbers Are Chosen: The Decision Tree (At Send-Time)

### Dynamic Number Selection

The system computes the effective number at send-time using this priority:

```typescript
// From: src/lib/messaging/dynamic-number-routing.ts
// Function: getEffectiveNumberForThread()

// Step 1: Check for active assignment window with sitter
if (activeWindow && activeWindow.sitter?.assignedNumbers?.length > 0) {
  return sitterNumber; // Use sitter's dedicated number
}

// Step 2: No active window → use pool number (for one-time/unassigned)
if (poolNumberAvailable) {
  return poolNumber;
}

// Step 3: Fallback → front desk number
return frontDeskNumber;
```

**Important:** This is computed dynamically - the thread stores an initial/default number, but the actual number used is determined by current state.

---

## Number Class Rules

### 1. **Sitter Number** (`class: 'sitter'`)

**When Assigned:**
- Booking has an assigned sitter (`sitterId` is present)
- Sitter has an available dedicated number

**How It Works:**
- Each sitter can have **one dedicated number** assigned to them
- The number is stored in `MessageNumber.assignedSitterId`
- If sitter already has a number, it's reused
- If sitter doesn't have a number, system finds an available `class: 'sitter'` number and assigns it

**Function:** `assignSitterMaskedNumber()` in `src/lib/messaging/number-helpers.ts`

**Guardrails:**
- Sitter numbers cannot be reassigned to another sitter for 90 days after deactivation
- After 90-day cooldown, deactivated sitter numbers become pool numbers (never reassigned as sitter numbers)

---

### 2. **Pool Number** (`class: 'pool'`)

**When Assigned:**
- Booking has no assigned sitter, OR
- Sitter doesn't have a dedicated number available, OR
- Client is classified as "one-time" (not recurring)

**How It Works:**
- System selects from available pool numbers using **LRU (Least Recently Used)** strategy
- Pool numbers can be shared across multiple threads (with routing safeguards)
- System tracks `lastUsedAt` to prefer numbers not recently used
- Respects `maxConcurrentThreadsPerPoolNumber` limit (default: 1 thread per number)

**Function:** `getPoolNumber()` in `src/lib/messaging/number-helpers.ts`

**Guardrails:**
- Pool numbers validate sender identity on inbound messages
- If sender is not mapped to an active thread, message routes to owner inbox + auto-response
- Prevents leakage between different clients using the same pool number

---

### 3. **Front Desk Number** (`class: 'front_desk'`)

**When Assigned:**
- Fallback when no sitter or pool numbers are available
- Meet-and-greet bookings (before approval)
- General inquiries and scheduling outside assignment windows
- Billing and payment links

**How It Works:**
- **Exactly one Front Desk number per organization**
- System looks for existing `class: 'front_desk'` number
- If none exists, throws error requiring manual setup

**Function:** `getOrCreateFrontDeskNumber()` in `src/lib/messaging/number-helpers.ts`

**Guardrails:**
- Only one Front Desk number per org (enforced by uniqueness check)

---

## Number Assignment Flow Diagram

### Sitter Activation (Persistent Assignment)
```
Sitter Activated
    ↓
assignSitterMaskedNumber()
    ↓
Find available sitter-class number
    ↓
Assign to sitter (persistent)
    ↓
Done (sitter keeps this number)
```

### Booking Confirmation (Thread + Window)
```
Booking Confirmed
    ↓
onBookingConfirmed()
    ↓
Find or Create Thread (orgId, clientId) - ONE THREAD PER CLIENT
    ↓
Create Assignment Window for booking
    ↓
Done (number chosen dynamically at send-time)
```

### Message Send (Dynamic Number Selection)
```
Message Send Request
    ↓
getEffectiveNumberForThread()
    ↓
    ├─→ Active window with sitter? → Sitter's Dedicated Number
    │       ↓ (no active window)
    ├─→ One-time/unassigned? → Pool Number
    │       ↓ (pool exhausted)
    └─→ Fallback → Front Desk Number
    ↓
Send message from selected number
```

---

## Important Notes

### ONE THREAD PER CLIENT PER ORG

- **Thread** = One conversation per client per organization
- **Number** = Chosen dynamically at send-time based on active windows
- A client has exactly one thread (enforced by unique constraint)
- Multiple bookings create multiple assignment windows within the same thread
- A sitter's dedicated number is persistent - assigned on activation, used for all bookings

### Idempotency

- `onBookingConfirmed()` is **idempotent** - can be called multiple times safely
- If thread already exists, it's reused
- If number already assigned, it's not reassigned
- Assignment windows are updated if dates change

### Number Persistence

- **Sitter numbers:** Assigned on activation, persist until sitter offboarding or manual change
- **Thread numbers:** Chosen dynamically at send-time based on active windows
  - During active window → sitter's dedicated number
  - Outside window → pool or front desk (based on client classification)

### Pool Number Reuse

- Pool numbers can be reused immediately if pool is tight
- Routing safeguards prevent message leakage
- System prefers numbers not used in last 30 days (if capacity allows)

---

## Manual Assignment

Owners can manually assign numbers via:
- **Messages → Numbers** tab: View and manage numbers
- **Messages → Assignments** tab: Create assignment windows (triggers number assignment)
- **Messages → Owner Inbox**: View threads and their assigned numbers

---

## Code References

- **Main Handler:** `src/lib/bookings/booking-confirmed-handler.ts`
- **Number Helpers:** `src/lib/messaging/number-helpers.ts`
- **Client Classification:** `src/lib/messaging/client-classification.ts`
- **Webhook Integration:** `src/app/api/webhooks/stripe/route.ts`
