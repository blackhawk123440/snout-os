# Staging Manual Test Steps

Quick operator-friendly checklist for testing Master Spec V1 in staging.

**Staging URL:** https://snout-form.onrender.com

---

## 1. Inbound Routing

### 1.1 Active Booking Routes to Sitter
1. Create booking with active assignment window (now - 1h to now + 1h)
2. Assign sitter to booking
3. Send SMS from client to sitter masked number
4. **Expected:** Message appears in JOB thread, sitter sees it
5. **Verify:** `GET /api/messages/threads` (as sitter) → thread visible

**Check:**
- Thread `scope='client_general'` and `bookingId` is set
- Message `direction='inbound'` and `actorType='client'`
- Sitter can see thread in list

### 1.2 No Booking Routes to Owner
1. Ensure no active booking for client
2. Send SMS from client to front desk number
3. **Expected:** Message routes to RELATIONSHIP thread, owner sees it
4. **Verify:** `GET /api/messages/threads` (as owner) → relationship thread visible

**Check:**
- Thread `scope='internal'` (relationship thread)
- Message appears in owner inbox
- Sitter cannot see this thread (404 if they try)

---

## 2. Outbound Sitter Send Gating

### 2.1 Inside Window - Allowed
1. Create assignment window (now - 1h to now + 1h)
2. As sitter: `POST /api/messages/send` with `threadId` and `text="On my way!"`
3. **Expected:** HTTP 200, message sent
4. **Verify:** Message appears in thread, client receives

**Check:**
- Response status: 200
- `MessageEvent` created with `deliveryStatus='sent'`
- Provider send called

### 2.2 Outside Window - Blocked
1. Update assignment window to be in past (endAt = now - 1 minute)
2. As sitter: `POST /api/messages/send` with same thread
3. **Expected:** HTTP 403, friendly error message
4. **Verify:** No `MessagePolicyViolation` created (window gating, not policy)

**Check:**
- Response status: 403
- Error message mentions assignment window
- No `MessagePolicyViolation` record
- Provider send NOT called

---

## 3. Anti-Poaching Enforcement

### 3.1 Phone Number Blocked
1. Ensure active assignment window exists
2. As sitter: `POST /api/messages/send` with `text="Text me at 555-123-4567"`
3. **Expected:** HTTP 400, violation created, owner notified
4. **Verify:** 
   - `MessagePolicyViolation` record exists
   - Owner inbox has notification
   - Message NOT sent to provider

**Check:**
```bash
# Check violation
GET /api/messages/violations
# Should see violation with reasons including "PHONE_NUMBER"
```

### 3.2 Email Blocked
1. As sitter: `POST /api/messages/send` with `text="Email me at test@example.com"`
2. **Expected:** HTTP 400, violation created
3. **Verify:** Violation has reason "EMAIL"

### 3.3 "Take it Offline" Blocked
1. As sitter: `POST /api/messages/send` with `text="Text me directly"`
2. **Expected:** HTTP 400, violation created
3. **Verify:** Violation has reason "SOCIAL_PHRASE"

---

## 4. Pool Number Reuse

### 4.1 Old Client Texts After Release
1. Assign pool number to Client A, create thread
2. Complete booking, release pool number
3. Assign same pool number to Client B
4. Client A texts pool number
5. **Expected:** Routes to owner inbox, auto-response sent
6. **Verify:** 
   - Message does NOT appear in Client B's thread
   - Owner inbox has message
   - Auto-response sent to Client A

**Check:**
- `MessageEvent` in owner inbox thread
- `metadataJson` contains routing reason
- Auto-response message sent

---

## 5. Thread Visibility

### 5.1 Sitter Cannot Access Relationship Thread
1. As owner: Get relationship thread ID
2. As sitter: `GET /api/messages/threads/<relationship-thread-id>`
3. **Expected:** HTTP 404 (not 403)
4. **Verify:** Sitter cannot see thread even if they guess ID

**Check:**
- Response status: 404
- Error message does not leak thread existence

---

## Troubleshooting

### Check Audit Events
```bash
GET /api/messages/audit?limit=50
```
Look for:
- `inbound_received` - Inbound messages
- `outbound_sent` - Successful sends
- `outbound_blocked` - Policy violations
- `delivery_failure` - Failed deliveries

### Check Violations
```bash
GET /api/messages/violations
```
Shows all policy violations with:
- Thread ID
- Sender user ID
- Reasons
- Redacted content

### Confirm Org Mapping
```bash
GET /api/messages/debug/state?threadId=<thread-id>
```
Shows:
- Thread orgId
- Participants
- Assignment windows
- Last messages

### Common Misconfigurations

1. **Missing Front Desk Number**
   - Error: "Front desk number not found"
   - Fix: Run setup script or create manually

2. **Missing Sitter Masked Number**
   - Error: "No unused SITTER_MASKED number available"
   - Fix: Run setup script to allocate numbers

3. **Wrong Webhook URL**
   - Error: "Invalid signature" or webhooks not received
   - Fix: Update `TWILIO_WEBHOOK_URL` in Render dashboard

4. **Assignment Window Not Active**
   - Error: Sitter send returns 403
   - Fix: Create assignment window with current time inside range

5. **Thread Not Found (404)**
   - Error: Sitter cannot see thread
   - Fix: Verify thread is JOB type and sitter is assigned

---

## Quick Verification Commands

```bash
# Health check
curl https://snout-form.onrender.com/api/health

# Get threads (as owner)
curl https://snout-form.onrender.com/api/messages/threads \
  -H "Cookie: next-auth.session-token=..."

# Get violations
curl https://snout-form.onrender.com/api/messages/violations \
  -H "Cookie: next-auth.session-token=..."

# Debug thread state
curl "https://snout-form.onrender.com/api/messages/debug/state?threadId=<id>" \
  -H "Cookie: next-auth.session-token=..."
```
