# Phase 4.2: Sitter Messages UI - Summary

**Phase**: 4.2  
**Date**: 2025-01-04  
**Status**: **COMPLETE** – Ready for Acceptance Testing

---

## Executive Summary

Phase 4.2 implements the sitter messages UI behind feature flag `ENABLE_SITTER_MESSAGES_V1` (default: false). Sitters see only assigned threads with active or upcoming windows, no owner inbox or billing threads. Thread view shows window status; composer enforces send gating with friendly UX. Anti-poaching shows a friendly warning to sitters without exposing client data. Integration tests for sitter filtering and send gating pass.

---

## Implemented

### Feature Flag
- **`ENABLE_SITTER_MESSAGES_V1`** (default: false) in `src/lib/env.ts`
- Gates all sitter access to threads, thread detail, and send

### Sitter Thread Filtering
- **GET /api/messages/threads**: When sitter + flag on, only threads with **active** or **upcoming** assignment window; no internal (owner inbox), no owner_sitter (billing)
- Response includes `activeWindow`, `nextUpcomingWindow` for sitter UI

### Thread View
- Window status in header: active, next upcoming, or "No active window – messaging disabled"
- Sitter never sees assign modal, force-send, or owner-only UI

### Composer Send Gating
- Send disabled when sitter has no active window
- Friendly message: "Messages can only be sent during your active booking windows." + next window times when available
- **NO_ACTIVE_WINDOW** API returns `nextWindow: { startAt, endAt }`

### Anti-Poaching (Sitter)
- Sitter-friendly response: no violations, no `messageEventId`, no client data
- Message: "Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles. Use the app for all client communication."
- Blocked messages in thread show "Message blocked" only (no violation details)

### API Gating
- **GET /api/messages/threads**, **GET /api/messages/threads/[id]**, **POST /api/messages/send**: 404 for sitter when `ENABLE_SITTER_MESSAGES_V1` false

### UI
- **GET /api/messages/me**: Returns `role`, `sitterMessagesEnabled`, `messagingV1Enabled`
- Messages page uses `/api/messages/me`; sitter sees Conversations only (no Owner Inbox), `role="sitter"` passed to list/view

### Integration Tests
- **`src/app/api/messages/__tests__/phase-4-2-sitter.test.ts`**:
  - Sitter + flag off → 404 on threads, thread detail, send
  - Owner + flag off → 200 on threads
  - Friendly NO_ACTIVE_WINDOW and anti-poaching message content verified

---

## Canonical Correction (isRecurringClient)

- **PHASE_4_PLAN.md**, **MESSAGING_MASTER_SPEC_V1_GAP_ANALYSIS.md**, **PHASE_4_3_ACCEPTANCE.md**, **PHASE_4_3_SUMMARY.md** updated:
  - We **do not** store `isRecurringClient` in schema
  - We store **`isOneTimeClient` only**
  - Recurring is derived from explicit recurrence signal on booking or weekly plan

---

## Manual Acceptance Test (Before Enabling Flags)

**Weekly booking assignment**

1. Assign sitter to a **weekly** booking.
2. Confirm thread appears **immediately** in owner messages.
3. Confirm **window status** shows correctly in thread header.
4. Send a message from owner.
5. Confirm it **routes correctly** (delivered, thread updated).

---

## Test Commands

```bash
npm test -- src/app/api/messages/__tests__/phase-4-2-sitter.test.ts
npm run build
```

---

## Acceptance Checklist

- [ ] Feature flag gates sitter access
- [ ] Sitter thread list: only assigned + active/upcoming window; no inbox/billing
- [ ] Thread view: window status indicator
- [ ] Composer: send gating with friendly UX
- [ ] Anti-poaching: friendly warning to sitter, no client data
- [ ] Integration tests pass
- [ ] Manual acceptance test (weekly booking assignment) run and passed

---

## Next Steps

After Phase 4.2 acceptance:
- Enable `ENABLE_PROACTIVE_THREAD_CREATION` and `ENABLE_SITTER_MESSAGES_V1` only after manual check passes.
