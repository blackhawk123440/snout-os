# Twilio Masking System - Runtime Proof

## Status: IN PROGRESS

This document tracks the end-to-end proof that the Twilio masking system works correctly.

## Test Plan

### Phase 1: Twilio Setup (Foundation)
- [ ] **1.1** Connect Provider: Save credentials successfully
- [ ] **1.2** Test Connection: Real Twilio API call returns success
- [ ] **1.3** Install Webhooks: Webhooks configured in Twilio dashboard
- [ ] **1.4** Readiness Check: All checks pass

**Network Calls:**
- `POST /api/setup/provider/connect` → 200, `{success: true, message: "..."}`
- `POST /api/setup/provider/test` → 200, `{success: true, message: "..."}`
- `POST /api/setup/webhooks/install` → 200, `{success: true, url: "..."}`
- `GET /api/setup/readiness` → 200, `{provider: {ready: true}, numbers: {ready: true}, webhooks: {ready: true}, overall: true}`

**DB Verification:**
```sql
SELECT orgId, providerType, encryptedConfig IS NOT NULL as has_credentials
FROM "ProviderCredential"
WHERE orgId = '<org-id>';
-- Expected: 1 row with has_credentials = true
```

### Phase 2: Owner "Message Anyone"
- [ ] **2.1** UI: Click "New Message" button
- [ ] **2.2** Enter phone number: `+15551234567`
- [ ] **2.3** Enter message: "Test message"
- [ ] **2.4** Send: Thread created, message sent

**Network Calls:**
- `POST /api/messages/threads` → 200, `{threadId: "...", clientId: "...", reused: false}`
- `POST /api/messages/threads/:id/messages` → 200, `{messageId: "...", hasPolicyViolation: false}`

**DB Verification:**
```sql
-- Verify one thread per org+client
SELECT orgId, "clientId", COUNT(*) as thread_count
FROM "Thread"
WHERE orgId = '<org-id>' AND "clientId" = '<client-id>'
GROUP BY orgId, "clientId";
-- Expected: 1 row with thread_count = 1

-- Verify message sent with correct from number
SELECT m.id, m."threadId", t."numberId", mn.e164 as from_number, m.body
FROM "Message" m
JOIN "Thread" t ON m."threadId" = t.id
JOIN "MessageNumber" mn ON t."numberId" = mn.id
WHERE m."threadId" = '<thread-id>' AND m.direction = 'outbound'
ORDER BY m."createdAt" DESC
LIMIT 1;
-- Expected: from_number = front_desk/master number
```

### Phase 3: Inbound Webhook
- [ ] **3.1** Client replies to number
- [ ] **3.2** Webhook received and validated
- [ ] **3.3** Thread resolved/created
- [ ] **3.4** Message stored in correct thread

**Network Calls:**
- `POST /api/messages/webhook/twilio` → 200, `{received: true}`

**DB Verification:**
```sql
-- Verify inbound message in correct thread
SELECT m.id, m."threadId", m.direction, m.body, m."providerMessageSid"
FROM "Message" m
WHERE m."providerMessageSid" = '<twilio-message-sid>';
-- Expected: 1 row with direction = 'inbound', threadId matches owner thread
```

### Phase 4: Sitter Routing (Active Window)
- [ ] **4.1** Booking confirmed creates AssignmentWindow
- [ ] **4.2** Owner sends message during active window
- [ ] **4.3** Message routes via sitter's masked number
- [ ] **4.4** Client sees sitter masked number, not personal

**Network Calls:**
- `POST /api/messages/threads/:id/messages` → 200
- Check request body: `fromNumberSid` = sitter's assigned masked number

**DB Verification:**
```sql
-- Verify AssignmentWindow created
SELECT id, "sitterId", "threadId", "startsAt", "endsAt", status
FROM "AssignmentWindow"
WHERE "threadId" = '<thread-id>' AND status = 'active'
ORDER BY "startsAt" DESC
LIMIT 1;
-- Expected: 1 row with active window

-- Verify message sent from sitter number
SELECT m.id, t."numberId", mn.e164, mn.class, mn."assignedSitterId"
FROM "Message" m
JOIN "Thread" t ON m."threadId" = t.id
JOIN "MessageNumber" mn ON t."numberId" = mn.id
WHERE m."threadId" = '<thread-id>' AND m.direction = 'outbound'
ORDER BY m."createdAt" DESC
LIMIT 1;
-- Expected: numberId points to sitter's assigned masked number
```

### Phase 5: Sitter Inbox
- [ ] **5.1** Sitter navigates to `/sitter/inbox`
- [ ] **5.2** Sees only threads with active windows
- [ ] **5.3** Can send message during active window
- [ ] **5.4** Cannot send outside window (UI disabled with reason)

**Network Calls:**
- `GET /api/messages/threads?sitterId=<sitter-id>` → 200, array of threads
- `POST /api/messages/threads/:id/messages` (during window) → 200
- `POST /api/messages/threads/:id/messages` (outside window) → 403 or blocked

**DB Verification:**
```sql
-- Verify sitter only sees threads with active windows
SELECT t.id, t."clientId", aw."startsAt", aw."endsAt"
FROM "Thread" t
JOIN "AssignmentWindow" aw ON t.id = aw."threadId"
WHERE aw."sitterId" = '<sitter-id>'
  AND aw.status = 'active'
  AND NOW() BETWEEN aw."startsAt" AND aw."endsAt";
-- Expected: Only threads with active windows
```

### Phase 6: Masking Verification
- [ ] **6.1** Sitter never sees client E164 in UI
- [ ] **6.2** Client never sees sitter personal number
- [ ] **6.3** Messages route through correct masked number

**UI Verification:**
- Sitter inbox: Client name shown, no phone number visible
- Owner inbox: Can see client phone (owner privilege)
- Message "from" field: Shows masked number, not personal

**DB Verification:**
```sql
-- Verify sitter numbers are masked (not personal)
SELECT id, e164, class, "assignedSitterId", status
FROM "MessageNumber"
WHERE "assignedSitterId" IS NOT NULL;
-- Expected: All have class = 'sitter', e164 is masked number (not personal)
```

## Screenshots Required

1. **Twilio Setup Tab:**
   - Provider Status: Connected ✅
   - Webhook Status: Installed ✅
   - Readiness: Ready ✅

2. **Owner Inbox:**
   - "New Message" button visible
   - Thread list shows created threads
   - Message view shows sent/received messages

3. **Network Tab (DevTools):**
   - All API calls return 200
   - Request/response bodies visible
   - No 500/404 errors

4. **Sitter Inbox:**
   - Active threads listed
   - Compose box enabled during window
   - Compose box disabled with message outside window

5. **Database Queries:**
   - Screenshot of SQL results proving uniqueness
   - Screenshot of message records with correct from numbers

## Current Issues (To Fix)

1. ❌ Setup endpoints fail when `NEXT_PUBLIC_API_URL` not set
2. ❌ No Prisma fallback for provider status/test/webhook endpoints
3. ❌ Test connection doesn't call real Twilio API
4. ❌ Webhook install doesn't actually configure Twilio
5. ❌ Readiness check endpoint missing or broken
6. ❌ Inbound webhook may not validate signature correctly
7. ❌ Send message may not use correct from number
8. ❌ Routing logic may not check AssignmentWindow correctly

## Next Steps

1. Implement Prisma fallbacks for all setup endpoints
2. Add real Twilio API calls for test connection
3. Implement webhook installation via Twilio API
4. Fix readiness check to validate actual state
5. Add comprehensive logging
6. Test end-to-end and document results
