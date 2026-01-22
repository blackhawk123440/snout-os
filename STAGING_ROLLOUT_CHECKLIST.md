# Staging Rollout Checklist

**Date**: 2025-01-04  
**Status**: Ready for Execution

---

## Overview

This checklist provides exact steps for staging rollout with verification criteria. Execute in order.

---

## Step 1: Enable Core Messaging (Staging Only)

### Set Flags
```bash
ENABLE_MESSAGING_V1=true
ENABLE_PROACTIVE_THREAD_CREATION=false
ENABLE_SITTER_MESSAGES_V1=false
```

### Verify
- [ ] Owner can send messages from `/messages` page
- [ ] Owner can receive messages (inbound webhook creates thread and event)
- [ ] Thread list shows in owner UI
- [ ] Thread detail shows messages
- [ ] **GET /api/messages/diagnostics** works and shows:
  - Thread counts by numberClass
  - Anti-poaching blocked count
  - Owner inbox routed count
  - Owner inbox routed operational count (new metric)
  - Last 50 routing decisions with redacted phone numbers

### Monitor
- [ ] Check diagnostics endpoint every 15 minutes
- [ ] Verify no errors in logs
- [ ] Verify phone numbers are redacted in logs (format: `+1555****3456`)

**Duration**: Run for 24 hours minimum before proceeding to Step 2.

---

## Step 2: Run Three Manual Checks

### Check 1: Weekly Booking Assignment

1. **Create or find a weekly booking** (client classified as recurring)
2. **Assign a sitter** to the booking via booking PATCH
3. **Verify**:
   - [ ] Thread appears **immediately** in owner messages (`/messages`)
   - [ ] Thread shows correct client and booking
   - [ ] Window status shows in thread header (if window exists)
   - [ ] Send a test message from owner
   - [ ] Message routes correctly (delivered, thread updated)

### Check 2: Outside Window Routing

1. **Find or create a thread** assigned to a sitter
2. **Ensure no active assignment window** (window expired or not yet started)
3. **Send a test message from client phone** to the thread's number
4. **Verify**:
   - [ ] Message routes to **owner inbox** (not to sitter)
   - [ ] Owner inbox thread shows the message
   - [ ] Diagnostics shows `ownerInboxRoutedOperational` count increased
   - [ ] Routing decision shows `routingTarget: "owner_inbox"` with `routingReason` containing "No active assignment window"

### Check 3: Pool Mismatch

1. **Find or create a pool number** thread
2. **Send a message from a different phone number** (not the client's number)
3. **Verify**:
   - [ ] Message routes to **owner inbox**
   - [ ] Auto-response sent to sender
   - [ ] Diagnostics shows `ownerInboxRoutedOperational` count increased
   - [ ] Routing decision shows `routingTarget: "owner_inbox"` with `routingReason: "Pool number mismatch"` or similar

### Report After Step 2

After completing all three manual checks, report:
- [ ] All three checks passed
- [ ] Diagnostics endpoint shows expected counts
- [ ] Routing decisions show correct reasons
- [ ] Any issues or unexpected behavior

---

## Step 3: Enable Proactive Threads

### Set Flags
```bash
ENABLE_MESSAGING_V1=true
ENABLE_PROACTIVE_THREAD_CREATION=true
ENABLE_SITTER_MESSAGES_V1=false
```

### Verify
- [ ] Assign sitter to **weekly** booking
- [ ] Thread created **immediately** (no message sent yet)
- [ ] Assignment window created with correct buffers
- [ ] **No duplicate threads** created (run assignment twice, verify idempotency)
- [ ] Owner UI shows thread with correct window status
- [ ] Diagnostics shows thread counts increase appropriately

### Monitor
- [ ] Check diagnostics: thread counts increase for recurring clients
- [ ] Verify no duplicate threads (check thread count before/after)
- [ ] Verify assignment windows created correctly (check window count)

**Duration**: Run for 24 hours minimum before proceeding to Step 4.

---

## Step 4: Enable Sitter Messages (Test Sitter Only)

### Set Flags
```bash
ENABLE_MESSAGING_V1=true
ENABLE_PROACTIVE_THREAD_CREATION=true
ENABLE_SITTER_MESSAGES_V1=true
```

**Note**: If per-sitter gating exists, enable only for test sitter. Otherwise, enable globally in staging only.

### Verify
- [ ] Log in as **test sitter**
- [ ] Open `/messages` - see only **Conversations** tab (no Owner Inbox)
- [ ] List shows only **assigned threads** with **active or upcoming window**
- [ ] **No owner inbox threads** visible
- [ ] **No billing threads** visible
- [ ] Open a thread - verify **window status** in header:
  - Active: "Active Window: X – Y"
  - Next only: "Next window: [date] – [time]"
  - None: "No active window – messaging disabled"
- [ ] **If outside window**: composer disabled, friendly message with next window
- [ ] **If inside window**: send message, verify delivery
- [ ] Send message that triggers **anti-poaching** (e.g., contains phone number)
- [ ] Verify **friendly warning only** (no violation details, no client data)

### Monitor
- [ ] Check diagnostics: `sitterNoActiveWindow` count
- [ ] Verify sitter can only see assigned threads
- [ ] Verify send gating works (blocked outside window)

**Duration**: Run for 24 hours minimum before production pilot.

---

## Diagnostics Endpoint

**GET /api/messages/diagnostics**

**Key Metrics**:
- `threadsByNumberClass`: Distribution across front_desk, sitter, pool
- `antiPoachingBlocked`: Messages blocked by anti-poaching
- `ownerInboxRouted`: All messages in owner inbox thread (may include other internal events)
- `ownerInboxRoutedOperational`: **Messages routed to owner for operational reasons** (no active window, overlap, pool mismatch) - **This is the real signal**
- `sitterNoActiveWindow`: Threads assigned to sitters with no active window
- `routingDecisions`: Last 50 with `routingReason` included

---

## Co-Owner Explanation (Human Terms)

**What to tell your co-owner:**

> "Clients will always text Snout, not a sitter's personal number.
> 
> When a booking is active, the sitter can message the client through Snout, but nobody's real number is shown.
> 
> When there's no active booking, texts go back to the front desk automatically so clients don't end up bothering sitters or losing support.
> 
> If anyone tries to swap numbers, the system blocks it and alerts us.
> 
> To the client, it feels like one professional company with clear boundaries, and we always tell them who's coming."

---

## Rollback

If any step fails:

1. **Disable the flag that was just enabled**
2. **Document the issue**
3. **Fix the issue**
4. **Re-run the step**

**Single flag flips**:
- `ENABLE_MESSAGING_V1=false` - Disables all messaging
- `ENABLE_PROACTIVE_THREAD_CREATION=false` - Stops proactive thread creation
- `ENABLE_SITTER_MESSAGES_V1=false` - Disables sitter access

---

## Next Steps After Step 2

After completing Step 2 (three manual checks), report:
- All checks passed / Issues found
- Diagnostics endpoint results
- Routing decisions look correct
- Ready for Step 3 / Need fixes
