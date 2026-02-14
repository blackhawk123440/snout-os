# Phone Number Assignment: When and How

## Overview

Phone numbers are **assigned to threads** (not directly to sitters or clients). The assignment happens automatically when a booking is confirmed, and the number class (Front Desk, Sitter, or Pool) is determined by business rules.

---

## When Numbers Are Assigned

### Primary Trigger: Booking Confirmation

**When:** A booking is confirmed (payment succeeds, status changes to "confirmed")

**Function:** `onBookingConfirmed()` in `src/lib/bookings/booking-confirmed-handler.ts`

**What Happens:**
1. Creates or reuses a thread for the booking
2. **Automatically assigns a masking number** to the thread
3. Creates an assignment window
4. Emits audit events

**Integration Point:** Stripe webhook (`src/app/api/webhooks/stripe/route.ts`) calls `onBookingConfirmed()` when payment succeeds.

---

## How Numbers Are Assigned: The Decision Tree

### Step 1: Determine Number Class

The system uses this priority order:

```typescript
// From: src/lib/bookings/booking-confirmed-handler.ts
// Function: assignMaskingNumberToThread()

// Rule 1: If booking has assigned sitter → use sitter's dedicated number
if (sitterId) {
  const sitterNumber = await findSitterNumber(sitterId);
  if (sitterNumber) {
    return { numberClass: 'sitter', numberId: sitterNumber.id };
  }
}

// Rule 2: If no sitter number → try pool number
if (!selectedNumber) {
  const poolNumber = await findPoolNumber();
  if (poolNumber) {
    return { numberClass: 'pool', numberId: poolNumber.id };
  }
}

// Rule 3: Fallback → front desk number
if (!selectedNumber) {
  const frontDeskNumber = await findFrontDeskNumber();
  return { numberClass: 'front_desk', numberId: frontDeskNumber.id };
}
```

### Step 2: Assign Number to Thread

Once the number class is determined, the number is assigned to the thread:

```typescript
// From: src/lib/bookings/booking-confirmed-handler.ts
await thread.update({
  where: { id: threadId },
  data: {
    numberId: selectedNumber.id,  // Links thread to number
    threadType: numberClass,      // Stores the class for reference
  },
});
```

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

```
Booking Confirmed
    ↓
onBookingConfirmed()
    ↓
Create/Reuse Thread
    ↓
assignMaskingNumberToThread()
    ↓
    ├─→ Has sitter? → assignSitterMaskedNumber() → Sitter Number
    │       ↓ (no sitter or no sitter number)
    ├─→ Try pool → getPoolNumber() → Pool Number
    │       ↓ (pool exhausted)
    └─→ Fallback → getOrCreateFrontDeskNumber() → Front Desk Number
    ↓
Update Thread.numberId
    ↓
Create Assignment Window
    ↓
Done
```

---

## Important Notes

### Numbers Are Assigned to Threads, Not Clients or Sitters

- **Thread** = Conversation between client and business
- **Number** = Phone number used for that conversation
- A client can have multiple threads (different bookings) with different numbers
- A sitter's dedicated number is used for all threads where that sitter is assigned

### Idempotency

- `onBookingConfirmed()` is **idempotent** - can be called multiple times safely
- If thread already exists, it's reused
- If number already assigned, it's not reassigned
- Assignment windows are updated if dates change

### Number Persistence

- Once assigned, the number stays with the thread until:
  - Thread is closed/deactivated
  - Number is manually reassigned (owner action)
  - Sitter is offboarded (sitter number deactivated)

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
