# Phase 4.1: Owner Messages UI Completeness - Acceptance Criteria

**Phase**: 4.1  
**Date**: 2025-01-04  
**Status**: Implementation Complete (Testing Required)

---

## Overview

Phase 4.1 implements the complete owner messaging UI with enhanced visibility into thread metadata, anti-poaching flags, assignment status, and force send capability.

---

## Implementation Summary

### Enhanced API Endpoints ✅

#### `GET /api/messages/threads`
**Enhancements**:
- ✅ Role-based filtering (owner sees all, sitter sees only assigned - preparing for Phase 4.2)
- ✅ Scope filtering (owner inbox via `?scope=internal`)
- ✅ Returns `numberClass`, `assignedSitterName`, `hasActiveWindow`, `hasAntiPoachingFlag`, `isBlocked`, `blockedEventId`
- ✅ Feature flag gating (`ENABLE_MESSAGING_V1`)

#### `GET /api/messages/threads/[id]`
**Enhancements**:
- ✅ Returns `activeWindow` status with start/end times
- ✅ Returns `assignmentHistory` with sitter names (fromSitterName, toSitterName)
- ✅ Returns message-level anti-poaching flags (`wasBlocked`, `antiPoachingFlagged`, `antiPoachingAttempt`, `redactedBody`)
- ✅ Sitter access control (preparing for Phase 4.2)
- ✅ Feature flag gating

### UI Components ✅

#### ConversationList Component
**Enhancements**:
- ✅ Displays number class badge (Front Desk, Sitter, Pool)
- ✅ Displays assigned sitter name
- ✅ Displays anti-poaching flag indicator (⚠️)
- ✅ Displays owner inbox badge for internal threads
- ✅ Supports scope filtering (`scope="internal"` for owner inbox)

#### ConversationView Component
**Enhancements**:
- ✅ Header shows number class, assigned sitter, active window status
- ✅ Blocked messages displayed with red border and warning banner
- ✅ Blocked message shows violation type and "Force Send" button (owner only)
- ✅ Redacted content shown for blocked messages
- ✅ Assignment history displayed with sitter names and reasons
- ✅ Active window status indicator

#### Force Send Modal
**Features**:
- ✅ Blocked content preview (redacted)
- ✅ Violation reasons list (type, detected content, action)
- ✅ Explicit reason input (required, with validation)
- ✅ Confirmation message explaining action is logged
- ✅ Calls `POST /api/messages/events/[id]/force-send`
- ✅ Updates UI after force send

#### Owner Inbox View
**Features**:
- ✅ Dedicated tab in messages page (desktop and mobile)
- ✅ Filters threads by `scope=internal`
- ✅ Shows all messages routed to owner inbox
- ✅ Same thread detail view as regular conversations

### Messages Page Updates ✅

**Enhancements**:
- ✅ Feature flag detection (checks API availability)
- ✅ Conditionally shows Conversations and Owner Inbox tabs when `ENABLE_MESSAGING_V1=true`
- ✅ Templates tab always visible
- ✅ Mobile filter bar includes Owner Inbox option when enabled

---

## Acceptance Criteria

### Thread List View
- [ ] Owner can view all threads
- [ ] Number class displayed correctly (Front Desk, Sitter, Pool badges)
- [ ] Assignment status shown (assigned sitter name)
- [ ] Anti-poaching flags visible (⚠️ indicator)
- [ ] Owner inbox threads clearly marked
- [ ] Unread count displayed

### Thread Detail View
- [ ] All messages visible with context
- [ ] Blocked messages shown with red border and warning
- [ ] Anti-poaching flags shown on blocked messages
- [ ] Assignment window status displayed (if active)
- [ ] Assignment history visible with sitter names
- [ ] Number class and assignment status in header

### Owner Inbox View
- [ ] Owner inbox tab visible when feature flag enabled
- [ ] Shows only internal scope threads
- [ ] Thread detail view works for inbox threads
- [ ] Routing reasons visible in thread context

### Force Send UI
- [ ] Force send button visible on blocked messages (owner only)
- [ ] Modal shows blocked content preview (redacted)
- [ ] Violation reasons list displayed
- [ ] Reason input required and validated
- [ ] Confirmation message shown
- [ ] Force send succeeds and updates UI
- [ ] Action logged in audit trail

---

## Test Commands

### Manual Testing
1. **Enable feature flag**: Set `ENABLE_MESSAGING_V1=true` in `.env.local`
2. **Start dev server**: `npm run dev`
3. **Navigate to**: `/messages`
4. **Verify tabs**: Conversations and Owner Inbox tabs visible
5. **Test thread list**: Verify number class, assignment status, anti-poaching flags
6. **Test thread detail**: Verify blocked messages, assignment history, window status
7. **Test force send**: Block a message, click Force Send, verify modal and submission

### Integration Tests
```bash
# Run Phase 4.1 specific tests (when created)
npm test -- src/app/messages/__tests__/phase-4-1-ui.test.ts
```

---

## Screenshots/Walkthrough Summary

### Walkthrough Steps:

1. **Navigate to Messages Page**
   - URL: `/messages`
   - Feature flag: `ENABLE_MESSAGING_V1=true`
   - Expected: See "Conversations" and "Owner Inbox" tabs (plus "Templates")

2. **View Thread List**
   - Click "Conversations" tab
   - Expected: List of threads with:
     - Client name
     - Number class badge (Front Desk/Sitter/Pool)
     - Assigned sitter name (if assigned)
     - Anti-poaching flag (⚠️) if flagged
     - Unread count

3. **View Thread Detail**
   - Click on a thread
   - Expected: Thread view showing:
     - Header with number class, assigned sitter, active window
     - Message list with blocked messages highlighted
     - Assignment history in assign modal

4. **View Blocked Message**
   - Find a thread with blocked message
   - Expected: Blocked message shows:
     - Red border
     - Warning banner with violation type
     - "Force Send" button (owner only)
     - Redacted content

5. **Force Send Blocked Message**
   - Click "Force Send" on blocked message
   - Expected: Modal opens with:
     - Redacted content preview
     - Violation reasons list
     - Required reason input
     - Confirmation message
   - Enter reason and click "Force Send"
   - Expected: Message sent, modal closes, thread refreshes

6. **View Owner Inbox**
   - Click "Owner Inbox" tab
   - Expected: List of internal threads (routing notifications, anti-poaching alerts)

---

## Known Limitations

1. **Feature Flag Detection**: Client-side detection via API call. Could be improved with server-side prop passing.

2. **Assignment History**: Currently shows last 5 assignments. Could be paginated in future.

3. **Window Status**: Shows active window times but doesn't update in real-time. Refresh required.

4. **Force Send**: Requires page refresh to see updated message status. Could be improved with optimistic updates.

---

## Next Steps

After Phase 4.1 acceptance:
- Phase 4.3: Operational integration (thread creation on booking assignment)
- Phase 4.2: Sitter Messages UI

---

## Files Modified

### API Endpoints
- `src/app/api/messages/threads/route.ts` - Enhanced with role-based filtering and Phase 4.1 fields
- `src/app/api/messages/threads/[id]/route.ts` - Enhanced with window status and assignment metadata

### UI Components
- `src/components/messaging/ConversationList.tsx` - Added number class, assignment status, anti-poaching flags
- `src/components/messaging/ConversationView.tsx` - Added blocked message display, force send modal, assignment history, window status

### Pages
- `src/app/messages/page.tsx` - Added owner inbox tab, feature flag detection

---

## Acceptance Checklist

- [ ] All API endpoints return enhanced fields correctly
- [ ] Thread list displays number class, assignment status, anti-poaching flags
- [ ] Thread detail shows blocked messages, assignment history, window status
- [ ] Owner inbox view works correctly
- [ ] Force send UI works end-to-end
- [ ] Feature flag properly gates UI visibility
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Manual walkthrough successful
