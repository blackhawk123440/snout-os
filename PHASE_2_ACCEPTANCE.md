# Phase 2: Assignment Window Enforcement - Acceptance Criteria

**Phase**: 2.1 - 2.4  
**Date**: 2025-01-04  
**Status**: Implementation Complete (Tests Required for Approval)

---

## AssignmentWindow Update Strategy

**Strategy**: Single window per booking per thread, updated in place.

When a booking or sitter assignment changes:
- If an active window exists for the booking+thread combination, it is **updated in place**
- The window's `sitterId`, `startAt`, and `endAt` are updated to reflect new assignment/times
- No duplicate windows are created
- When a booking is cancelled or completed, all active windows are closed (status = 'closed')

This is enforced by `findOrCreateAssignmentWindow()` which checks for existing active windows before creating new ones.

---

## Phase 2.1: Routing Resolution Engine ✅

### Implementation
- **File**: `src/lib/messaging/routing-resolution.ts`
- **Function**: `resolveRoutingForInboundMessage(threadId, timestamp)`
- **Integration**: `src/app/api/messages/webhook/twilio/route.ts`

### Acceptance Criteria
- ✅ Exactly one active window → route to that sitter
- ✅ No active window → route to owner inbox
- ✅ Overlapping active windows → route to owner inbox by default
- ✅ Returns routing resolution with target, sitterId, reason, and metadata

### Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-2-integration.test.ts
```

### Pass Criteria
- ✅ Exactly one active window → routes to sitter
- ✅ No active window → routes to owner inbox
- ✅ Overlapping windows → routes to owner inbox with reason containing "overlap" or "Multiple overlapping"
- ✅ Thread with no booking → routes to owner inbox

---

## Phase 2.2: Sitter Send Gating ✅

### Implementation
- **File**: `src/app/api/messages/send/route.ts`
- **Function**: Blocks sitter outbound messages outside active windows
- **Owner**: Always allowed (no window check)

### Acceptance Criteria
- ✅ Sitter messages blocked unless active window exists
- ✅ Owner messages always allowed
- ✅ Returns 403 with clear error message when blocked

### Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-2-integration.test.ts
```

### Pass Criteria
- ✅ Sitter outbound during active window succeeds (returns 200, creates MessageEvent)
- ✅ Sitter outbound outside window returns 403 with clear error message
- ✅ Sitter outbound outside window does NOT create MessageEvent
- ✅ Owner outbound always succeeds regardless of windows

---

## Phase 2.3: Window Creation and Maintenance ✅

### Implementation
- **File**: `src/lib/messaging/window-helpers.ts`
- **Integration**: 
  - `src/app/api/bookings/[id]/route.ts` (booking updates)
  - `src/app/api/messages/threads/[id]/assign/route.ts` (thread assignment)

### Buffer Configuration
- ✅ **Drop-in and walk**: 60 minutes pre/post
- ✅ **House sitting**: 2 hours pre/post
- ✅ **Pet Taxi**: 60 minutes pre/post
- ✅ **24/7 Care**: 2 hours pre/post

### Acceptance Criteria
- ✅ Windows created when sitter assigned to booking
- ✅ Windows updated when booking times change
- ✅ Windows closed when booking cancelled/completed
- ✅ Windows created when sitter assigned to thread with bookingId

### Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-2-integration.test.ts
```

### Pass Criteria
- ✅ Booking create with sitter generates AssignmentWindow with correct buffers per service type
  - Drop-ins/Walk: 60 minutes pre/post
  - Housesitting/24/7 Care: 2 hours pre/post
- ✅ Booking update (times change) updates existing window without creating duplicate
- ✅ Booking cancel closes all active windows (status = 'closed')
- ✅ Thread assignment creates window if booking exists
- ✅ Assignment change updates window sitterId (same window, updated in place)

---

## Phase 2.4: Tests and Acceptance Docs ✅

### Test Suite
- ✅ `phase-2-integration.test.ts` - Comprehensive Phase 2 integration tests
  - Inbound routing tests
  - Sitter send gating tests
  - Window lifecycle tests

### Proof Script
```bash
npm run proof:phase2
```

**Command**: `npm run proof:phase2`

**What it does**:
1. Runs `npx prisma migrate deploy` (or `npx prisma db push` if no migrations)
2. Runs `npm run proof:phase1-5` (Phase 1 proof scripts)
3. Runs `npm test -- src/app/api/messages/__tests__/phase-2-integration.test.ts`
4. Prints `PASS` if all checks pass, exits with error code 1 if any fail

### Pass Criteria
- ✅ Proof script exits with code 0
- ✅ Proof script prints "PASS"
- ✅ All Phase 2 integration tests pass
- ✅ No test failures or errors

---

## Integration Points

### Webhook Routing
- Inbound messages routed to owner inbox if no active window
- Inbound messages routed to sitter if exactly one active window
- Inbound messages routed to owner inbox if multiple overlapping windows

### Send Endpoint
- Sitter send blocked outside active windows
- Owner send always allowed
- Clear error messages when blocked

### Booking Updates
- Windows created/updated on sitter assignment
- Windows updated on booking time changes
- Windows closed on cancellation/completion

### Thread Assignment
- Windows created when sitter assigned to thread with bookingId
- Windows closed when sitter unassigned

---

## Acceptance Checklist

- [ ] All Phase 2 integration tests pass
  - [ ] Inbound routing: exactly one window → sitter
  - [ ] Inbound routing: no window → owner inbox
  - [ ] Inbound routing: overlapping windows → owner inbox
  - [ ] Inbound routing: no booking → owner inbox
  - [ ] Sitter send: active window → succeeds
  - [ ] Sitter send: outside window → 403, no MessageEvent
  - [ ] Owner send: always succeeds
  - [ ] Window create: correct buffers per service type
  - [ ] Window update: no duplicates, updates in place
  - [ ] Window close: booking cancel closes windows
  - [ ] Window assignment: creates/updates on thread assignment
- [ ] Proof script (`npm run proof:phase2`) prints "PASS"
- [ ] No test failures or errors
- [ ] No regression in Phase 1 tests

---

## Known Limitations

1. **Thread Creation**: Threads are created on-demand when messages arrive. If a booking has a sitter assigned but no messages have been sent, no thread exists yet and no window will be created until the first message arrives.

2. **Buffer Configuration**: Buffers are hardcoded per service type. Per spec, these should be configurable per service type later, but defaults are in place now.

3. **Window Expiry**: Active windows can extend past booking end times. Windows should be marked as "expired" after their end time, but current implementation relies on status checks.

---

## Next Steps

After Phase 2 acceptance:
- Phase 3: Anti-poaching enforcement
- Window expiry automation (mark expired windows)
- Configurable buffer per service type
- Owner UI for assignment window management
