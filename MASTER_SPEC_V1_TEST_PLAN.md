# SNOUTOS MESSAGING MASTER SPEC V1 - Comprehensive Test Plan

## Test Environment Setup

**Staging URL:** https://snout-form.onrender.com  
**Database:** Staging PostgreSQL  
**Test Accounts:**
- Owner: (from env)
- Sitter: (from env)
- Test Client: (create test client)

---

## 1. NUMBER ALLOCATION POLICY TESTS

### 1.1 Front Desk Number (1 permanent)
**Test:** Verify front desk number exists and is configured
- [ ] Front desk number exists in `MessageNumber` table with `numberClass='front_desk'`
- [ ] Front desk number is active and owned by org
- [ ] Owner can send from front desk number
- [ ] Automation can send from front desk number
- [ ] Clients receive messages from front desk number

**How to verify:**
```sql
SELECT * FROM "MessageNumber" WHERE "numberClass" = 'front_desk' AND "status" = 'active';
```

### 1.2 Sitter Masked Numbers (1 per active sitter)
**Test:** Verify sitter onboarding allocates masked number
- [ ] Create new sitter → System allocates one unused `SITTER_MASKED` number
- [ ] Number is bound permanently to sitter account (`SitterMaskedNumber` record created)
- [ ] Number is activated in messaging provider
- [ ] Sitter sees messages in SnoutOS inbox
- [ ] Owner has visibility of all sitter messages
- [ ] Sitter never sees client real numbers
- [ ] Client never sees sitter real numbers

**How to verify:**
```bash
# Create test sitter via API
POST /api/sitters
# Check database
SELECT * FROM "SitterMaskedNumber" WHERE "sitterId" = '<sitter-id>';
SELECT * FROM "MessageNumber" WHERE "id" = '<number-id>' AND "numberClass" = 'sitter';
```

### 1.3 Rotating Pool Numbers
**Test:** Verify pool number assignment and release
- [ ] Pool number can be assigned temporarily to client
- [ ] Pool number is released after booking completion
- [ ] Pool number can be reused for different clients
- [ ] If old client texts after release → routes to owner with auto-response
- [ ] Pool number routing validates sender identity

**How to verify:**
```sql
-- Check pool numbers
SELECT * FROM "MessageNumber" WHERE "numberClass" = 'pool' AND "status" = 'active';
-- Check pool assignments
SELECT * FROM "MessageThread" WHERE "numberClass" = 'pool';
```

---

## 2. SITTER ONBOARDING NUMBER ASSIGNMENT FLOW

### 2.1 New Sitter Onboarding
**Test:** Complete onboarding flow
- [ ] Create new sitter account
- [ ] System automatically allocates unused masked number
- [ ] `SitterMaskedNumber` record created with `status='active'`
- [ ] Number bound to sitter (cannot be reassigned)
- [ ] Sitter can receive messages at masked number
- [ ] Owner can see all sitter messages

**Steps:**
1. Create sitter via API: `POST /api/sitters`
2. Verify number allocation in database
3. Send test message to sitter masked number
4. Verify sitter receives in inbox
5. Verify owner can see message

### 2.2 Sitter Assignment to Client
**Test:** Assignment flow after meet and greet
- [ ] Owner assigns sitter to client
- [ ] Client communication transitions from front desk to sitter masked number
- [ ] Thread remains linked to client and booking
- [ ] Client sees sitter name in messages
- [ ] Sitter can send to client during active window

**Steps:**
1. Create booking with sitter assignment
2. Verify `AssignmentWindow` created
3. Send message from client → verify routes to sitter
4. Send message from sitter → verify client receives
5. Verify thread shows correct participants

---

## 3. SITTER OFFBOARDING AND LEAVE HANDLING

### 3.1 Immediate Actions on Sitter Exit
**Test:** Offboarding flow
- [ ] Deactivate sitter → masked number deactivated immediately
- [ ] All routing disabled for deactivated number
- [ ] Active client threads reassigned (or flagged for owner)
- [ ] Old sitter cannot receive messages
- [ ] Old sitter cannot send messages
- [ ] Clients receive reassignment message (if applicable)

**Steps:**
1. Deactivate sitter via API or admin panel
2. Verify `SitterMaskedNumber.status` = 'deactivated'
3. Verify `MessageNumber.status` = 'inactive' or 'quarantined'
4. Attempt to send message to deactivated number → should fail
5. Verify old threads are reassigned or flagged

### 3.2 Reassignment Communication
**Test:** Client notification on sitter change
- [ ] System sends reassignment message to affected clients
- [ ] Message clearly identifies new sitter
- [ ] Message explains change professionally
- [ ] Old sitter number no longer routes to them

---

## 4. THREAD TYPES AND VISIBILITY RULES

### 4.1 Relationship Thread (Client + Owner only)
**Test:** Billing and policy threads
- [ ] Relationship thread created for billing/policy communication
- [ ] Sitters CANNOT see relationship threads (404 if they try)
- [ ] Owner can see all relationship threads
- [ ] Billing messages only in relationship thread
- [ ] Thread persists for weekly clients

**How to verify:**
```bash
# As owner: GET /api/messages/threads → should see relationship threads
# As sitter: GET /api/messages/threads → should NOT see relationship threads
# As sitter: GET /api/messages/threads/<relationship-thread-id> → should return 404
```

### 4.2 Job Thread (Client + Sitter + Owner)
**Test:** Active service communication
- [ ] Job thread created when booking starts
- [ ] Sitter can see job thread only if assigned
- [ ] Sitter can send only during active assignment window
- [ ] Owner can see all job threads
- [ ] Thread persists for weekly clients

**How to verify:**
```bash
# Create booking with assignment window
# As sitter: GET /api/messages/threads → should see assigned job threads
# As sitter: POST /api/messages/send (outside window) → should return 403
# As sitter: POST /api/messages/send (inside window) → should succeed
```

### 4.3 Pool/Broadcast Thread (Internal only)
**Test:** Internal communication
- [ ] Pool threads are internal only
- [ ] No client involvement
- [ ] Used for job offers to sitters

---

## 5. ROUTING RULES

### 5.1 Client Inbound Messages
**Test:** Inbound routing logic
- [ ] **Active booking window exists** → Route to assigned sitter(s)
- [ ] **No active booking** → Route to owner inbox
- [ ] **Number previously used but no longer assigned** → Route to owner + auto-response
- [ ] **Pool number mismatch** → Route to owner + auto-response

**Steps:**
1. Create booking with active assignment window
2. Send SMS from client to sitter masked number
3. Verify message appears in sitter inbox
4. End assignment window
5. Send SMS from client → verify routes to owner inbox
6. Release pool number
7. Send SMS from old client to pool number → verify routes to owner + auto-response

**How to verify:**
```bash
# Send test webhook
POST /api/messages/webhook/twilio
{
  "From": "+15551234567",  # Client number
  "To": "+15559876543",    # Sitter masked number
  "Body": "Test message"
}
# Check routing in database
SELECT * FROM "MessageEvent" WHERE "threadId" = '<thread-id>' ORDER BY "createdAt" DESC;
```

### 5.2 Sitter Outbound Messages
**Test:** Send gating based on assignment windows
- [ ] **Inside active window** → Send allowed
- [ ] **Outside active window** → Send blocked with friendly message
- [ ] **No assignment** → Send blocked
- [ ] **Owner override** → Can force send if needed

**Steps:**
1. Create assignment window (now - 1 hour to now + 1 hour)
2. As sitter: Send message → should succeed
3. Update window to be in past (endAt = now - 1 minute)
4. As sitter: Send message → should return 403 with friendly message
5. Verify no `MessagePolicyViolation` created for window gating

**How to verify:**
```bash
# As sitter: POST /api/messages/send
{
  "threadId": "<job-thread-id>",
  "text": "On my way!"
}
# Inside window: Should return 200
# Outside window: Should return 403 with message about assignment window
```

---

## 6. ANTI-POACHING ENFORCEMENT

### 6.1 Content Blocking
**Test:** Block messages containing sensitive information
- [ ] **Phone numbers** → Blocked
- [ ] **Email addresses** → Blocked
- [ ] **Social handles** → Blocked
- [ ] **"Text me directly" phrases** → Blocked
- [ ] **External contact attempts** → Blocked

**Test Cases:**
1. "Text me at 555-123-4567" → Should be blocked
2. "Email me at test@example.com" → Should be blocked
3. "Find me on Instagram @username" → Should be blocked
4. "Text me directly" → Should be blocked
5. "Call me at my number" → Should be blocked

**How to verify:**
```bash
# As sitter: POST /api/messages/send
{
  "threadId": "<job-thread-id>",
  "text": "Text me at 555-123-4567"
}
# Should return 400 with friendly warning
# Verify MessagePolicyViolation record created
# Verify owner notification created
# Verify message NOT sent to provider
```

### 6.2 Policy Enforcement
**Test:** Violation logging and owner notification
- [ ] Blocked message creates `MessagePolicyViolation` record
- [ ] Owner is flagged/notified
- [ ] Audit log recorded
- [ ] Sender sees friendly warning (no technical details)
- [ ] Owner can force-send with reason logged

**How to verify:**
```sql
-- Check violations
SELECT * FROM "MessagePolicyViolation" ORDER BY "createdAt" DESC;
-- Check owner notifications
SELECT * FROM "MessageEvent" WHERE "threadId" = '<owner-inbox-thread-id>' AND "body" LIKE '%Policy Violation%';
```

---

## 7. AUTOMATION ROUTING RULES

### 7.1 Front Desk Automations
**Test:** Automation messages from front desk number
- [ ] Booking confirmations sent from front desk
- [ ] Scheduling updates from front desk
- [ ] Meet and greet coordination from front desk
- [ ] Billing reminders from front desk
- [ ] Payment links from front desk
- [ ] Policy notices from front desk

**How to verify:**
```bash
# Trigger automation (e.g., booking confirmation)
# Verify message sent from front desk number
# Verify thread is relationship thread (for billing) or appropriate thread
```

### 7.2 Sitter-Level Automations
**Test:** Automation from sitter masked numbers
- [ ] Arrival notifications from sitter number
- [ ] Service confirmations from sitter number
- [ ] Care updates from sitter number (if enabled)

### 7.3 Weekly Client Automation Behavior
**Test:** Weekly client automation rules
- [ ] Payment link sent weekly
- [ ] No review spam
- [ ] No tip spam unless intentional
- [ ] Schedule reminders allowed
- [ ] Service confirmations allowed

### 7.4 One-Time Client Automation Behavior
**Test:** One-time client automation rules
- [ ] Booking confirmation sent
- [ ] Tip link sent
- [ ] Review request sent
- [ ] Rebook prompt sent

---

## 8. BILLING ISOLATION RULES

### 8.1 Billing Message Isolation
**Test:** Billing messages only in relationship thread
- [ ] Billing messages only visible in relationship thread
- [ ] Sitters NEVER see payment links
- [ ] Sitters NEVER see billing history
- [ ] Billing always sent from front desk number
- [ ] Owner retains financial authority

**How to verify:**
```bash
# Send billing message
# Verify it goes to relationship thread (not job thread)
# As sitter: GET /api/messages/threads → should NOT see relationship thread
# As sitter: GET /api/messages/threads/<relationship-thread-id> → should return 404
```

---

## 9. CLIENT TRUST REQUIREMENTS

### 9.1 Message Identification
**Test:** Clear identification in messages
- [ ] Every message clearly identifies who is speaking
- [ ] Sitter name clearly shown when applicable
- [ ] Changes communicated proactively
- [ ] No surprises to client
- [ ] Relationship continuity preserved

**How to verify:**
- Review sample messages sent to test client
- Verify sitter name appears in messages
- Verify reassignment messages are clear

---

## 10. EDGE CASE HANDLING

### 10.1 Old Client Texts After Pool Number Reuse
**Test:** Pool number routing after release
- [ ] Old client texts released pool number
- [ ] Message routes to owner inbox (not active thread)
- [ ] Auto-response sent to client
- [ ] Message does NOT attach to active client thread

**Steps:**
1. Assign pool number to Client A
2. Complete booking, release pool number
3. Assign same pool number to Client B
4. Client A texts pool number
5. Verify routes to owner inbox
6. Verify auto-response sent
7. Verify does NOT appear in Client B's thread

### 10.2 Multiple Sitters Same Day
**Test:** Routing with overlapping assignments
- [ ] System uses schedule windows for routing
- [ ] Owner override available if needed
- [ ] No duplicate messages to client

### 10.3 House Sitting Transitions
**Test:** Handoff messages
- [ ] System sends handoff message
- [ ] Message explicitly names sitters
- [ ] Clear transition communication

### 10.4 SMS Delivery Failures
**Test:** Retry and escalation
- [ ] System retries failed deliveries
- [ ] Retries logged
- [ ] Owner alerted if failure persists
- [ ] Message status updated correctly

**How to verify:**
```sql
-- Check message status
SELECT "id", "deliveryStatus", "attemptCount", "lastAttemptAt", "providerErrorCode" 
FROM "MessageEvent" 
WHERE "deliveryStatus" = 'failed' OR "attemptCount" > 0;
```

---

## 11. OWNER SUPERVISION CAPABILITIES

### 11.1 Owner Dashboard Features
**Test:** Owner visibility and control
- [ ] **All message visibility** → Owner can see all threads
- [ ] **Per sitter response time** → Metrics available
- [ ] **Quality audits** → Audit trail accessible
- [ ] **Policy violation flags** → Violations visible
- [ ] **Manual override routing** → Owner can reassign
- [ ] **Emergency takeover** → Owner can take over thread

**How to verify:**
```bash
# Owner endpoints
GET /api/messages/threads → Should return all threads
GET /api/messages/audit → Should return audit events
GET /api/messages/violations → Should return policy violations
GET /api/messages/debug/state?threadId=<id> → Should return full thread state
```

---

## 12. SECURITY AND COMPLIANCE

### 12.1 Security Features
**Test:** Security and compliance
- [ ] **All messages logged** → `MessageEvent` records created
- [ ] **Immutable audit trail** → `MessagingAuditEvent` records
- [ ] **Role-based access controls** → Sitters can't access owner threads
- [ ] **Provider signature verification** → Webhook signatures verified
- [ ] **No direct personal data exposure** → Numbers masked, PII redacted

**How to verify:**
```sql
-- Check audit trail
SELECT * FROM "MessagingAuditEvent" ORDER BY "createdAt" DESC LIMIT 20;
-- Check message logging
SELECT COUNT(*) FROM "MessageEvent";
-- Check PII redaction in logs (manual review)
```

---

## 13. INTEGRATION TEST SCENARIOS

### Scenario 1: Complete Client Journey
1. Client texts front desk number → Routes to owner
2. Owner creates booking, assigns sitter
3. Client texts sitter masked number → Routes to sitter
4. Sitter responds during active window → Client receives
5. Booking ends, window closes
6. Client texts again → Routes to owner inbox
7. Owner reassigns to new sitter
8. Client texts → Routes to new sitter

### Scenario 2: Anti-Poaching Prevention
1. Sitter tries to send phone number → Blocked
2. Sitter tries to send email → Blocked
3. Sitter tries "text me directly" → Blocked
4. Owner notified of violations
5. Owner can force-send with reason logged

### Scenario 3: Sitter Offboarding
1. Sitter has active assignments
2. Owner deactivates sitter
3. Sitter number deactivated immediately
4. Clients notified of reassignment
5. Old sitter cannot send/receive
6. New sitter assigned, clients updated

---

## 14. AUTOMATED TEST SUITE

Run the existing test suite:
```bash
npm test
```

Key test files to verify:
- `src/app/api/messages/__tests__/anti-poaching-integration.test.ts`
- `src/app/api/messages/__tests__/tenantIsolation.test.ts`
- `src/app/api/messages/__tests__/window-gating-ordering.test.ts`
- `src/lib/messaging/__tests__/number-system.test.ts`
- `src/lib/messaging/__tests__/thread-visibility.test.ts`

---

## 15. MANUAL VERIFICATION CHECKLIST

### Setup
- [ ] Staging environment running
- [ ] Database connected
- [ ] Twilio configured
- [ ] Test accounts created

### Number System
- [ ] Front desk number exists
- [ ] Can create sitter and verify number allocation
- [ ] Can deactivate sitter and verify number deactivation

### Routing
- [ ] Inbound routing works (active window → sitter, no window → owner)
- [ ] Outbound send gating works (inside window → allow, outside → block)
- [ ] Pool number routing works

### Anti-Poaching
- [ ] Phone number blocking works
- [ ] Email blocking works
- [ ] Phrase detection works
- [ ] Owner notifications work

### Visibility
- [ ] Owner sees all threads
- [ ] Sitter sees only assigned threads
- [ ] Sitter cannot access relationship threads

### Audit & Compliance
- [ ] Audit events logged
- [ ] Policy violations logged
- [ ] PII redacted in logs

---

## 16. TEST RESULTS TEMPLATE

For each test, record:
- **Test Name:** [Name]
- **Status:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
- **Notes:** [Any issues or observations]
- **Screenshots/Logs:** [If applicable]

---

## Next Steps

1. Run automated test suite: `npm test`
2. Execute manual tests in staging
3. Document any gaps or issues
4. Create fixes for any failures
5. Re-test after fixes
