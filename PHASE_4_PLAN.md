# Phase 4: UI and Rollout Integration - Execution Plan

**Phase**: 4.1 - 4.3  
**Date**: 2025-01-04  
**Status**: Planning Complete (Awaiting Approval)

---

## Overview

Phase 4 completes the messaging system by adding UI components and operational integrations to make the system production-ready for both owners and sitters.

---

## Phase 4.1: Owner Messages UI Completeness

### Objectives
- Owner can view all threads with full context
- Owner can see number class and assignment status
- Owner can view anti-poaching flags and owner inbox notifications
- Owner can force send blocked messages with reason

### Implementation Tasks

#### 4.1.1: Thread List View Enhancement
**File**: `src/app/messages/page.tsx` (or new component)

**Features**:
- Display thread list with:
  - Client name/phone
  - Number class badge (Front Desk, Sitter Masked, Pool)
  - Assignment status (Assigned Sitter name or "Unassigned")
  - Last message timestamp
  - Unread count
  - Anti-poaching flag indicator (⚠️ if flagged)
  - Owner inbox badge for owner inbox threads

**API Endpoints Needed**:
- `GET /api/messages/threads` - Enhanced to include number class, assignment status, anti-poaching flags

**Acceptance Criteria**:
- ✅ Owner sees all threads
- ✅ Number class displayed correctly
- ✅ Assignment status shown
- ✅ Anti-poaching flags visible
- ✅ Owner inbox threads clearly marked

#### 4.1.2: Thread Detail View Enhancement
**File**: `src/app/messages/[id]/page.tsx` (or thread detail component)

**Features**:
- Message list with:
  - Message direction (inbound/outbound)
  - Actor type (client, sitter, owner)
  - Timestamp
  - Anti-poaching flag indicator on blocked messages
  - Assignment window status (if applicable)
  - Assignment audit history

**API Endpoints Needed**:
- `GET /api/messages/threads/[id]` - Enhanced with full message events
- `GET /api/messages/threads/[id]/assignments` - Assignment audit history

**Acceptance Criteria**:
- ✅ All messages visible with context
- ✅ Anti-poaching flags shown on blocked messages
- ✅ Assignment window status displayed
- ✅ Assignment history visible

#### 4.1.3: Owner Inbox View
**File**: `src/app/messages/inbox/page.tsx` (new)

**Features**:
- Dedicated view for owner inbox thread
- List of all messages routed to owner inbox
- Routing reasons shown (pool mismatch, outside window, anti-poaching)
- Quick actions: Assign sitter, Reply, Create booking

**API Endpoints Needed**:
- `GET /api/messages/threads?scope=internal` - Owner inbox thread
- Uses existing thread detail endpoint

**Acceptance Criteria**:
- ✅ Owner inbox messages visible
- ✅ Routing reasons shown
- ✅ Quick actions work

#### 4.1.4: Force Send UI
**File**: `src/app/messages/[id]/force-send/page.tsx` or modal component

**Features**:
- Modal/Page for force sending blocked messages
- Shows original blocked message content (redacted)
- Requires reason input
- Calls `POST /api/messages/events/[id]/force-send`
- Updates UI after force send

**API Endpoints**:
- `POST /api/messages/events/[id]/force-send` (already implemented)

**Acceptance Criteria**:
- ✅ Force send UI accessible from blocked messages
- ✅ Reason required
- ✅ Message sent after force send
- ✅ UI updates correctly

### Phase 4.1 Test Command
```bash
npm test -- src/app/messages/__tests__/owner-ui.test.ts
```

### Phase 4.1 Acceptance Checklist
- [ ] Owner can view all threads
- [ ] Number class displayed correctly
- [ ] Assignment status shown
- [ ] Anti-poaching flags visible
- [ ] Owner inbox messages visible
- [ ] Force send UI works
- [ ] All owner UI tests pass

---

## Phase 4.2: Sitter Messages UI

### Objectives
- Sitter sees only assigned threads
- Send is blocked outside windows with friendly UX
- Sitter never sees billing relationship threads

### Implementation Tasks

#### 4.2.1: Sitter Thread List View
**File**: `src/app/sitters/[id]/messages/page.tsx` (new)

**Features**:
- Filter threads to only show:
  - `assignedSitterId` matches current sitter
  - `scope` NOT equal to 'internal' (no owner inbox)
  - `scope` NOT equal to 'owner_sitter' (no billing threads)
- Display:
  - Client name (limited client data per spec 7.1.1)
  - Last message timestamp
  - Active assignment window indicator
  - Unread count

**API Endpoints Needed**:
- `GET /api/sitters/[id]/messages/threads` - Filtered thread list for sitter

**Acceptance Criteria**:
- ✅ Only assigned threads visible
- ✅ Owner inbox threads hidden
- ✅ Billing threads hidden
- ✅ Active window indicator shown

#### 4.2.2: Sitter Thread Detail View
**File**: `src/app/sitters/[id]/messages/[threadId]/page.tsx` (new)

**Features**:
- Message list (limited client data)
- Send message composer
- Assignment window status indicator
- Blocked send UI with friendly message

**API Endpoints**:
- `GET /api/messages/threads/[id]` - With sitter-scoped filtering
- `POST /api/messages/send` - Already implemented with window gating

**Acceptance Criteria**:
- ✅ Only assigned thread visible
- ✅ Send composer works during active window
- ✅ Friendly blocked message when outside window
- ✅ No billing threads visible

#### 4.2.3: Send Blocking UX
**File**: Send composer component

**Features**:
- Show active assignment window status
- If outside window, disable send button with message:
  "Messages can only be sent during active booking windows. Your window for this client is [start] - [end]."
- Real-time window status check

**API Endpoints**:
- `GET /api/messages/threads/[id]/window` - Get active window status

**Acceptance Criteria**:
- ✅ Send disabled outside window
- ✅ Friendly message shown
- ✅ Window times displayed
- ✅ Real-time status updates

### Phase 4.2 Test Command
```bash
npm test -- src/app/sitters/__tests__/messages-ui.test.ts
```

### Phase 4.2 Acceptance Checklist
- [ ] Sitter sees only assigned threads
- [ ] Owner inbox threads hidden
- [ ] Billing threads hidden
- [ ] Send blocked outside window with friendly UX
- [ ] Window status indicator works
- [ ] All sitter UI tests pass

---

## Phase 4.3: Operational Integration Upgrade

### Objectives
- Create threads and assignment windows on booking assignment for weekly clients
- Avoid first-message edge cases where no thread exists yet

### Implementation Tasks

#### 4.3.1: Thread Creation on Booking Assignment
**File**: `src/lib/messaging/thread-helpers.ts` (new) or integrate into existing hooks

**Features**:
- When a sitter is assigned to a booking:
  - If client is weekly client (recurring; derived from explicit recurrence signal on booking or weekly plan; we store `isOneTimeClient` only, not `isRecurringClient`):
    - Find or create thread with `bookingId` and `clientId`
    - Thread scope: `client_booking` (for service threads)
    - Assign sitter to thread
    - Create assignment window immediately
  - If client is one-time (`isOneTimeClient` true):
    - Defer thread creation until first message (current behavior)

**Integration Points**:
- `src/app/api/bookings/[id]/route.ts` - On sitter assignment
- `src/app/api/messages/threads/[id]/assign/route.ts` - On thread assignment

**Acceptance Criteria**:
- ✅ Thread created when sitter assigned to weekly client booking
- ✅ Assignment window created immediately
- ✅ Thread linked to booking
- ✅ No duplicate threads created

#### 4.3.2: Assignment Window Creation on Booking Assignment
**File**: Integrate into existing window helpers

**Features**:
- When sitter assigned to booking:
  - If thread exists (weekly client) or is created:
    - Create assignment window with correct buffers
    - Link window to thread and booking
  - Ensure no duplicate windows

**Integration Points**:
- `src/app/api/bookings/[id]/route.ts` - After sitter assignment
- Use existing `findOrCreateAssignmentWindow()` function

**Acceptance Criteria**:
- ✅ Window created on booking assignment
- ✅ Window has correct buffers per service type
- ✅ No duplicate windows

#### 4.3.3: Weekly Client Detection Integration
**File**: Use existing client classification logic

**Features**:
- When booking created/updated:
  - Check if client is weekly client using `determineClientClassification()`
  - If weekly, trigger thread creation flow on sitter assignment
  - If one-time, defer to message-first flow

**Integration Points**:
- `src/lib/messaging/client-classification.ts` - Use existing `determineClientClassification()`
- `src/app/api/bookings/[id]/route.ts` - On booking update with sitter assignment

**Acceptance Criteria**:
- ✅ Weekly clients trigger thread creation on assignment
- ✅ One-time clients defer to message-first
- ✅ Classification logic consistent

### Phase 4.3 Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-4-3-integration.test.ts
```

### Phase 4.3 Acceptance Checklist
- [ ] Thread created when sitter assigned to weekly client booking
- [ ] Assignment window created immediately
- [ ] Weekly client detection works
- [ ] One-time clients still use message-first flow
- [ ] No duplicate threads or windows
- [ ] All integration tests pass

---

## Implementation Order

### Recommended Sequence:
1. **Phase 4.3** (Operational Integration) - Foundation for UI
   - Ensures threads exist when UI needs them
   - Reduces edge cases in UI testing

2. **Phase 4.1** (Owner UI) - Critical for operations
   - Owners need visibility first
   - Force send is important for operational flow

3. **Phase 4.2** (Sitter UI) - User-facing feature
   - Depends on operational integration working
   - Depends on owner UI for context

### Alternative Sequence (if UI priority):
1. Phase 4.1 (Owner UI)
2. Phase 4.3 (Operational Integration)
3. Phase 4.2 (Sitter UI)

---

## API Endpoints Summary

### New Endpoints Required:
1. `GET /api/sitters/[id]/messages/threads` - Filtered thread list for sitter
2. `GET /api/messages/threads/[id]/window` - Get active window status
3. `GET /api/messages/threads/[id]/assignments` - Assignment audit history

### Enhanced Endpoints:
1. `GET /api/messages/threads` - Add number class, assignment status, anti-poaching flags
2. `GET /api/messages/threads/[id]` - Add window status, assignment history

---

## Test Strategy

### Unit Tests:
- UI component tests for each view
- Helper function tests for thread creation logic

### Integration Tests:
- End-to-end thread creation on booking assignment
- Window creation on booking assignment
- Sitter-scoped filtering
- Owner force send flow

### Manual Testing:
- Owner UI workflow
- Sitter UI workflow
- Thread creation on booking assignment
- Window creation and expiration

---

## Acceptance Criteria Summary

### Phase 4.1: Owner Messages UI
- ✅ Owner can view all threads
- ✅ Number class and assignment status visible
- ✅ Anti-poaching flags visible
- ✅ Owner inbox messages visible
- ✅ Force send UI works

### Phase 4.2: Sitter Messages UI
- ✅ Sitter sees only assigned threads
- ✅ Send blocked outside window with friendly UX
- ✅ Sitter never sees billing threads

### Phase 4.3: Operational Integration
- ✅ Threads created on booking assignment for weekly clients
- ✅ Assignment windows created immediately
- ✅ No first-message edge cases

---

## Dependencies

- Phase 1: Complete ✅
- Phase 2: Complete ✅
- Phase 3: Complete ✅
- Phase 3.1: Hardening patch (in progress)

---

## Risks and Mitigations

### Risk 1: Thread Creation Performance
- **Risk**: Creating threads on booking assignment may slow booking updates
- **Mitigation**: Use async/background job for thread creation if needed

### Risk 2: Weekly Client Detection Accuracy
- **Risk**: Incorrect classification may create unnecessary threads
- **Mitigation**: Use explicit classification flags, conservative defaults

### Risk 3: UI Complexity
- **Risk**: Owner UI may become cluttered with all information
- **Mitigation**: Progressive disclosure, clear visual hierarchy

---

## Next Steps

1. Review and approve Phase 4 plan
2. Complete Phase 3.1 hardening patch
3. Implement Phase 4 in approved sequence
4. Test each phase before proceeding to next
