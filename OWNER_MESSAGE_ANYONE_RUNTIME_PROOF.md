# Owner "Message Anyone" Runtime Proof

## Required DevTools Screenshots

### 1. POST /api/messages/threads (200)

**Steps:**
1. Open DevTools → Network tab
2. Navigate to `/messages?tab=inbox`
3. Click "New Message" button
4. Enter phone number: `+15551234567`
5. Enter message: `Test message`
6. Click "Send Message"

**Expected Request:**
```
POST /api/messages/threads
Status: 200 OK
Request Body:
{
  "phoneNumber": "+15551234567",
  "initialMessage": "Test message"
}
Response Body:
{
  "threadId": "thread-uuid",
  "clientId": "client-uuid",
  "reused": false
}
Response Headers:
X-Snout-Route: prisma-fallback
X-Snout-OrgId: <orgId>
```

**Screenshot Requirements:**
- Network tab showing request/response
- Response body showing `threadId` and `clientId`
- Headers showing `X-Snout-OrgId`

### 2. POST /api/messages/threads/:id/messages (200)

**Steps:**
1. After thread creation, send another message in the same thread
2. Type message in compose box
3. Click "Send"

**Expected Request:**
```
POST /api/messages/threads/{threadId}/messages
Status: 200 OK
Request Body:
{
  "body": "Second message",
  "forceSend": false
}
Response Body:
{
  "messageId": "message-uuid",
  "providerMessageSid": "SM...",
  "hasPolicyViolation": false
}
Response Headers:
X-Snout-Route: prisma-fallback (or proxy)
X-Snout-OrgId: <orgId>
```

**Screenshot Requirements:**
- Network tab showing request/response
- Response body showing `messageId` and `providerMessageSid`
- Verify `from` number equals front_desk/master number (check message record in DB)

### 3. Verify From Number Equals Front Desk/Master Number

**DB Query:**
```sql
-- Get thread's assigned number
SELECT 
  t.id as thread_id,
  t."clientId",
  mn.e164 as from_number,
  mn.class as number_class,
  mn.status as number_status
FROM "Thread" t
JOIN "MessageNumber" mn ON t."numberId" = mn.id
WHERE t.id = '<threadId>'
  AND t."orgId" = '<orgId>';

-- Expected: number_class = 'front_desk', status = 'active'
```

**Screenshot Requirements:**
- DB query result showing `number_class = 'front_desk'`
- Message record showing `from` number matches front_desk e164

## DB Proof Queries

### Single Client Per Phone Per Org

```sql
-- Verify: One client per phone per org
SELECT 
  cc.e164,
  c."orgId",
  COUNT(DISTINCT c.id) as client_count,
  COUNT(DISTINCT t.id) as thread_count
FROM "ClientContact" cc
JOIN "Client" c ON cc."clientId" = c.id
LEFT JOIN "Thread" t ON t."clientId" = c.id AND t."orgId" = c."orgId"
WHERE c."orgId" = '<orgId>'
  AND cc.e164 = '+15551234567'
GROUP BY cc.e164, c."orgId";

-- Expected: client_count = 1, thread_count = 1
```

### Single Thread Per Org+Client

```sql
-- Verify: One thread per org+client
SELECT 
  t."orgId",
  t."clientId",
  COUNT(*) as thread_count
FROM "Thread" t
WHERE t."orgId" = '<orgId>'
  AND t."clientId" = '<clientId>'
GROUP BY t."orgId", t."clientId";

-- Expected: thread_count = 1
```

### Phone-to-Client Resolution

```sql
-- Verify: Phone resolves to single client
SELECT 
  cc.e164,
  c.id as client_id,
  c.name as client_name,
  c."orgId"
FROM "ClientContact" cc
JOIN "Client" c ON cc."clientId" = c.id
WHERE cc.e164 = '+15551234567'
  AND c."orgId" = '<orgId>';

-- Expected: Exactly one row
```

## Test Scenarios

### Scenario 1: New Phone Number
1. Send message to `+15559876543` (never seen before)
2. Verify: New guest client created
3. Verify: New thread created with front_desk number
4. Verify: Message sent from front_desk number

### Scenario 2: Existing Phone Number
1. Send message to `+15551234567` (already has guest client)
2. Verify: Existing client reused
3. Verify: Existing thread reused
4. Verify: Message sent from front_desk number

### Scenario 3: Phone Number Later Becomes Real Client
1. Send message to `+15551111111` (creates guest)
2. Later, create client with same phone
3. Verify: Same client reused (no duplicate)
4. Verify: Same thread reused (no duplicate)

## Verification Checklist

- [ ] Screenshot: POST /api/messages/threads → 200
- [ ] Screenshot: POST /api/messages/threads/:id/messages → 200
- [ ] Screenshot: DB query showing single client per phone
- [ ] Screenshot: DB query showing single thread per org+client
- [ ] Screenshot: Message record showing from number = front_desk
- [ ] Test: New phone creates guest client
- [ ] Test: Existing phone reuses client
- [ ] Test: Phone→client uniqueness maintained
