# Phase 4.2: Sitter Messages UI - Acceptance Criteria

**Phase**: 4.2  
**Date**: 2025-01-04  
**Status**: Implementation Complete (Testing Required)

---

## Overview

Phase 4.2 implements the sitter messages UI behind feature flag `ENABLE_SITTER_MESSAGES_V1` (default: false). Sitters see only assigned threads with active or upcoming windows, no owner inbox or billing threads. Thread view shows window status; composer enforces send gating with friendly UX. Anti-poaching blocking shows a friendly warning to sitters without exposing client data.

---

## Feature Flag

- **`ENABLE_SITTER_MESSAGES_V1`** (default: false)
- Gates all sitter access to threads, thread detail, and send endpoints
- When disabled: sitters receive 404 on `GET /api/messages/threads`, `GET /api/messages/threads/[id]`, `POST /api/messages/send`

---

## Implementation Summary

### Sitter Thread Filtering

- **GET /api/messages/threads** (when sitter + flag on):
  - Only threads where `assignedSitterId` = current sitter
  - Only threads with **active** OR **upcoming** assignment window for that sitter
  - Explicitly allowed meet-and-greet threads (via active/upcoming window)
  - **No** owner inbox threads (`scope !== 'internal'`)
  - **No** billing relationship threads (`scope !== 'owner_sitter'`)
- Response includes `activeWindow`, `nextUpcomingWindow` for sitter UI

### Thread View

- Window status indicator in header:
  - Active: "Active Window: X – Y"
  - Next only: "Next window: [date] – [time]"
  - None: "No active window – messaging disabled"
- Sitter never sees assign modal, force-send, or owner-only UI

### Composer Send Gating

- When sitter and **no active window**:
  - Send button disabled
  - Input disabled with placeholder "Messaging disabled outside booking window"
  - Friendly message: "Messages can only be sent during your active booking windows." + next window times if available
- When sitter and **active window**: send enabled
- **NO_ACTIVE_WINDOW** API response includes `nextWindow: { startAt, endAt }` for friendly UX

### Anti-Poaching (Sitter)

- Sitter **never** sees violation details, redacted content, or `messageEventId`
- Friendly warning only: "Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles. Use the app for all client communication."
- Blocked messages in thread show "Message blocked" for sitter (no violation type, no redacted body)

### API Gating

- **GET /api/messages/threads**: 404 for sitter when `ENABLE_SITTER_MESSAGES_V1` false
- **GET /api/messages/threads/[id]**: 404 for sitter when flag false
- **POST /api/messages/send**: 404 for sitter when flag false (`errorCode: SITTER_MESSAGES_DISABLED`)

### UI

- **GET /api/messages/me**: Returns `role`, `sitterMessagesEnabled`, `messagingV1Enabled`
- Messages page uses `/api/messages/me` to switch owner vs sitter experience
- Sitter: Conversations tab only (no Owner Inbox), `role="sitter"` passed to list/view
- Owner: Conversations + Owner Inbox + Templates

---

## Acceptance Criteria

### AC1: Feature Flag
- [ ] `ENABLE_SITTER_MESSAGES_V1=false`: sitter gets 404 on threads, thread detail, send
- [ ] `ENABLE_SITTER_MESSAGES_V1=true`: sitter can use messages UI when otherwise eligible

### AC2: Sitter Thread List
- [ ] Only threads where sitter is assigned and has **active** or **upcoming** window
- [ ] No owner inbox threads
- [ ] No billing relationship threads
- [ ] Meet-and-greet threads with allowed window shown

### AC3: Thread View
- [ ] Window status indicator (active / next / none) in header
- [ ] No assign modal, force-send, or owner-only UI for sitter

### AC4: Composer Send Gating
- [ ] Send disabled when sitter has no active window
- [ ] Friendly message with next window times when available
- [ ] Send enabled during active window

### AC5: Anti-Poaching Sitter UX
- [ ] Blocked send returns friendly warning only (no violations, no client data)
- [ ] Blocked messages in thread show generic "Message blocked" for sitter (no violation details)

### AC6: Integration Tests
- [ ] Sitter + flag off → 404 on threads, thread detail, send
- [ ] Owner + flag off → 200 on threads
- [ ] Friendly NO_ACTIVE_WINDOW and anti-poaching message content verified

---

## Test Commands

```bash
npm test -- src/app/api/messages/__tests__/phase-4-2-sitter.test.ts
```

**Expected**: All Phase 4.2 sitter tests pass.

---

## Manual Acceptance Test (Before Enabling Flags)

**Weekly booking assignment**

1. **Assign sitter to a weekly booking**
   - Use a client classified as recurring (explicit recurrence or weekly plan)
   - Assign a sitter via booking PATCH

2. **Confirm thread appears immediately in owner messages**
   - `ENABLE_PROACTIVE_THREAD_CREATION=true`, `ENABLE_MESSAGING_V1=true`
   - Open `/messages` as owner
   - Thread for that booking + client should appear in Conversations

3. **Confirm window status shows correctly**
   - Open the thread
   - Header should show "Active Window" or "Next window" as appropriate

4. **Send a message from owner**
   - Use composer, send a test message

5. **Confirm it routes correctly**
   - Message delivered to client (or via proxy as configured)
   - Thread `lastMessageAt` etc. updated

---

## Manual Sitter UI Test (When ENABLE_SITTER_MESSAGES_V1=true)

1. Log in as sitter (session linked to sitter).
2. Open `/messages`. See only Conversations tab (no Owner Inbox).
3. List shows only assigned threads with active/upcoming window.
4. Open a thread. Verify window status in header.
5. If outside window: composer disabled, friendly message with next window.
6. If inside window: send a message. Verify delivery.
7. Send a message that triggers anti-poaching (e.g. contains a phone number). Verify friendly warning only, no violation details.

---

## Files Modified / Added

- `src/lib/env.ts` – `ENABLE_SITTER_MESSAGES_V1`
- `src/app/api/messages/threads/route.ts` – sitter gate, window filter, `activeWindow` / `nextUpcomingWindow`
- `src/app/api/messages/threads/[id]/route.ts` – sitter gate, `nextUpcomingWindow`
- `src/app/api/messages/send/route.ts` – sitter gate, friendly NO_ACTIVE_WINDOW + nextWindow, sitter-friendly anti-poaching response
- `src/app/api/messages/me/route.ts` – **new** – `role`, `sitterMessagesEnabled`
- `src/lib/messaging/routing-resolution.ts` – `getNextUpcomingWindow`
- `src/components/messaging/ConversationView.tsx` – window status, send gating, sitter blocked-message UX
- `src/app/messages/page.tsx` – `/api/messages/me`, role-based tabs, `role` prop
- `src/app/api/messages/__tests__/phase-4-2-sitter.test.ts` – **new** – Phase 4.2 integration tests

---

## Rollback

Set `ENABLE_SITTER_MESSAGES_V1=false`. Sitters will receive 404 on messaging endpoints; owner flows unchanged.
