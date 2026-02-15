# Messaging System Testing Guide

Complete guide for testing the messaging system in SnoutOS.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [E2E Tests](#e2e-tests)
5. [Manual Testing](#manual-testing)
6. [API Testing](#api-testing)
7. [Common Test Scenarios](#common-test-scenarios)

---

## Quick Start

### Prerequisites

```bash
# Ensure dependencies are installed
npm install

# Ensure database is set up
npm run db:push

# Start dev server (if testing manually)
npm run dev
```

### Run All Tests

```bash
# Unit tests (fast, no external dependencies)
npm test

# Integration tests (requires database)
npm run test:integration

# E2E tests (requires running server)
npm run test:ui
```

---

## Unit Tests

Unit tests verify individual functions and components in isolation.

### Run Unit Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- src/lib/messaging/__tests__/invariants.test.ts

# Watch mode (re-run on changes)
npm test -- --watch
```

### Key Unit Test Files

- **Messaging Logic:**
  - `src/lib/messaging/__tests__/invariants.test.ts` - Business rule validation
  - `src/lib/messaging/__tests__/number-helpers.test.ts` - Number utilities
  - `src/lib/messaging/__tests__/pool-capacity.test.ts` - Pool management
  - `src/lib/messaging/__tests__/pool-release.test.ts` - Number release logic
  - `src/lib/messaging/__tests__/one-thread-per-client.test.ts` - Thread creation rules
  - `src/lib/messaging/__tests__/persistent-sitter-number.test.ts` - Sitter number assignment

- **Provider Tests:**
  - `src/lib/messaging/__tests__/twilio-provider.test.ts` - Twilio integration

### Example Unit Test

```typescript
// Tests business invariants
describe('Messaging Invariants', () => {
  it('should enforce one thread per client per number', async () => {
    // Test implementation
  });
});
```

---

## Integration Tests

Integration tests verify API endpoints and database interactions.

### Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- src/app/api/messages/__tests__/messaging-integration.test.ts
```

### Key Integration Test Files

- **Core Messaging:**
  - `src/app/api/messages/__tests__/messaging-integration.test.ts` - Webhook, send, org isolation
  - `src/app/api/messages/__tests__/phase-1-3-integration.test.ts` - Phase 1-3 features
  - `src/app/api/messages/__tests__/phase-2-integration.test.ts` - Phase 2 features
  - `src/app/api/messages/__tests__/phase-3-integration.test.ts` - Phase 3 features
  - `src/app/api/messages/__tests__/phase-4-2-sitter.test.ts` - Sitter features
  - `src/app/api/messages/__tests__/phase-4-3-integration.test.ts` - Phase 4 integration

- **Security & Policy:**
  - `src/app/api/messages/__tests__/master-spec-anti-poaching.test.ts` - Anti-poaching enforcement
  - `src/app/api/messages/__tests__/webhook-negative.test.ts` - Webhook error cases
  - `src/app/api/messages/__tests__/phase-1-5-hardening.test.ts` - Security hardening

### What Integration Tests Cover

1. **Webhook Processing:**
   - Inbound message creates thread, participant, event
   - Org isolation enforced
   - Session creation

2. **Message Sending:**
   - Outbound message creation
   - Policy enforcement
   - Delivery tracking

3. **Routing:**
   - Active booking routes to sitter
   - No booking routes to owner
   - Pool number reuse handling

4. **Security:**
   - Cross-org access prevention
   - Sitter gating (assignment windows)
   - Anti-poaching detection

---

## E2E Tests

E2E tests verify the full user experience using Playwright.

### Run E2E Tests

```bash
# Run all E2E tests
npm run test:ui

# Run specific test file
npm run test:ui -- tests/e2e/messaging-features.spec.ts

# Run in headed mode (see browser)
npm run test:ui -- --headed

# Run with UI mode (interactive)
npm run test:ui -- --ui
```

### Key E2E Test Files

- `tests/e2e/messaging-features.spec.ts` - UI features (threads, messages, filters)
- `tests/e2e/sitter-messages-protection.spec.ts` - Sitter access control
- `tests/e2e/pool-exhausted-integration.spec.ts` - Pool exhaustion scenarios
- `tests/e2e/role-routing.spec.ts` - Role-based routing

### E2E Test Prerequisites

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Ensure test data exists:**
   - Tests use `/api/ops/seed-smoke` to create test data
   - Or manually seed: `npx tsx scripts/seed-messaging-data.ts`

3. **Authentication:**
   - Tests use `storageState` for authentication
   - See `tests/e2e/helpers/login.ts`

### Example E2E Test

```typescript
test('Thread selection loads messages', async ({ page }) => {
  await page.goto('http://localhost:3000/messages');
  await page.waitForSelector('text=Threads');
  // Click thread and verify messages load
});
```

---

## Manual Testing

### Quick Test Checklist

See `QUICK_TEST_CHECKLIST.md` for a simple 3-question test:

1. **Send outbound message** → Did you receive it?
2. **Reply from phone** → Does ngrok show the POST?
3. **Check SnoutOS** → Did reply appear?

### Full Manual Test Steps

See `STAGING_MANUAL_TEST_STEPS.md` for comprehensive manual testing:

#### 1. Inbound Routing

**Test: Active Booking Routes to Sitter**
1. Create booking with active assignment window
2. Assign sitter to booking
3. Send SMS from client to sitter masked number
4. **Expected:** Message appears in JOB thread, sitter sees it

**Test: No Booking Routes to Owner**
1. Ensure no active booking for client
2. Send SMS from client to front desk number
3. **Expected:** Message routes to RELATIONSHIP thread, owner sees it

#### 2. Outbound Sitter Send Gating

**Test: Inside Window - Allowed**
1. Create assignment window (now - 1h to now + 1h)
2. As sitter: `POST /api/messages/send` with `threadId` and `text="On my way!"`
3. **Expected:** HTTP 200, message sent

**Test: Outside Window - Blocked**
1. Update assignment window to be in past
2. As sitter: `POST /api/messages/send` with same thread
3. **Expected:** HTTP 403, friendly error message

#### 3. Anti-Poaching Enforcement

**Test: Phone Number Blocked**
1. As sitter: `POST /api/messages/send` with `text="Text me at 555-123-4567"`
2. **Expected:** HTTP 400, violation created, owner notified

**Test: Email Blocked**
1. As sitter: `POST /api/messages/send` with `text="Email me at test@example.com"`
2. **Expected:** HTTP 400, violation created

**Test: "Take it Offline" Blocked**
1. As sitter: `POST /api/messages/send` with `text="Text me directly"`
2. **Expected:** HTTP 400, violation created

#### 4. Pool Number Reuse

**Test: Old Client Texts After Release**
1. Assign pool number to Client A, create thread
2. Complete booking, release pool number
3. Assign same pool number to Client B
4. Client A texts pool number
5. **Expected:** Routes to owner inbox, auto-response sent

#### 5. Thread Visibility

**Test: Sitter Cannot Access Relationship Thread**
1. As owner: Get relationship thread ID
2. As sitter: `GET /api/messages/threads/<relationship-thread-id>`
3. **Expected:** HTTP 404 (not 403)

---

## API Testing

### Using curl

#### Get Threads

```bash
# As owner (all threads)
curl http://localhost:3000/api/messages/threads \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# As owner (owner inbox only)
curl "http://localhost:3000/api/messages/threads?inbox=owner" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# As sitter (filtered by sitter)
curl "http://localhost:3000/api/messages/threads?sitterId=SITTER_ID" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

#### Get Messages for Thread

```bash
curl "http://localhost:3000/api/messages/threads/THREAD_ID/messages" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

#### Send Message

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "threadId": "THREAD_ID",
    "body": "Hello, this is a test message"
  }'
```

#### Retry Failed Message

```bash
curl -X POST "http://localhost:3000/api/messages/MESSAGE_ID/retry" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

#### Get Violations

```bash
curl http://localhost:3000/api/messages/violations \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

#### Debug Thread State

```bash
curl "http://localhost:3000/api/messages/debug/state?threadId=THREAD_ID" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Using Browser DevTools

1. Open `/messages` page
2. Open DevTools → Network tab
3. Filter by "messages" or "threads"
4. Inspect requests/responses:
   - `GET /api/messages/threads` - Thread list
   - `GET /api/messages/threads/:id/messages` - Messages for thread
   - `POST /api/messages/send` - Send message

### Using Postman/Insomnia

1. Import collection (if available)
2. Set base URL: `http://localhost:3000`
3. Set authentication: Cookie with `next-auth.session-token`
4. Test endpoints:
   - `GET /api/messages/threads`
   - `POST /api/messages/send`
   - `GET /api/messages/threads/:id/messages`

---

## Common Test Scenarios

### Scenario 1: New Client Conversation

**Setup:**
1. Client sends SMS to front desk number
2. No existing thread for this client

**Expected:**
- Thread created with `scope='internal'` (relationship thread)
- Participant created for client
- Message event created with `direction='inbound'`
- Thread appears in owner inbox

**Verify:**
```bash
# Check thread was created
GET /api/messages/threads?inbox=owner

# Check message exists
GET /api/messages/threads/THREAD_ID/messages
```

### Scenario 2: Sitter Assignment

**Setup:**
1. Thread exists (relationship thread)
2. Booking created with active assignment window
3. Sitter assigned to booking

**Expected:**
- Thread updated with `assignedSitterId`
- Thread `scope` may change to `'client_general'` (job thread)
- Sitter can see thread in their inbox

**Verify:**
```bash
# As sitter: check thread is visible
GET /api/messages/threads?sitterId=SITTER_ID

# Check thread assignment
GET /api/messages/threads/THREAD_ID
```

### Scenario 3: Policy Violation

**Setup:**
1. Sitter tries to send message with phone number
2. Message: "Text me at 555-123-4567"

**Expected:**
- HTTP 400 response
- Policy violation record created
- Message NOT sent to provider
- Owner notified (violation appears in owner inbox)

**Verify:**
```bash
# Check violations
GET /api/messages/violations

# Check thread (should show violation banner)
GET /api/messages/threads/THREAD_ID
```

### Scenario 4: Delivery Failure

**Setup:**
1. Send message that fails (invalid number, provider error)
2. Delivery status becomes 'failed'

**Expected:**
- Message event created with `deliveryStatus='failed'`
- Retry button appears in UI
- Retry endpoint available

**Verify:**
```bash
# Check message delivery status
GET /api/messages/threads/THREAD_ID/messages

# Retry failed message
POST /api/messages/MESSAGE_ID/retry
```

### Scenario 5: Pool Number Release

**Setup:**
1. Pool number assigned to Client A
2. Booking completed
3. Pool number released
4. Same pool number assigned to Client B
5. Client A texts old pool number

**Expected:**
- Message routes to owner inbox (not Client B's thread)
- Auto-response sent to Client A
- Routing reason logged in metadata

**Verify:**
```bash
# Check owner inbox for message
GET /api/messages/threads?inbox=owner

# Check routing history
GET /api/routing/threads/THREAD_ID/history
```

---

## Troubleshooting

### Tests Failing

**Unit Tests:**
- Check database schema is up to date: `npm run db:push`
- Check mocks are properly configured
- Run with `--reporter=verbose` for more details

**Integration Tests:**
- Ensure database is accessible
- Check environment variables are set
- Verify test data setup scripts

**E2E Tests:**
- Ensure dev server is running: `npm run dev`
- Check authentication state
- Verify test data exists (run seed script)

### Manual Testing Issues

**Webhook Not Receiving:**
- Check ngrok is running: `ngrok http 3000`
- Verify webhook URL in Twilio console
- Check Proxy Service callback URL (if using Proxy)

**Messages Not Sending:**
- Check Twilio credentials in `.env.local`
- Verify phone number is valid
- Check server logs for errors

**Messages Not Appearing:**
- Check webhook is receiving requests (ngrok inspector)
- Verify webhook handler is working
- Check database for message events

### Debug Commands

```bash
# Check diagnostics
curl http://localhost:3000/api/messages/diagnostics | jq .

# Check thread state
curl "http://localhost:3000/api/messages/debug/state?threadId=THREAD_ID" | jq .

# Check audit events
curl "http://localhost:3000/api/messages/audit?limit=50" | jq .

# Check violations
curl http://localhost:3000/api/messages/violations | jq .
```

---

## Test Data Setup

### Seed Demo Data

```bash
# Seed messaging threads and messages
npx tsx scripts/seed-messaging-data.ts

# Or use API endpoint (dev only)
curl -X POST http://localhost:3000/api/messages/seed \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Create Test Users

```bash
# Create test users (owner, sitter)
npx tsx scripts/create-test-users.ts
```

### Manual Test Data

1. Create booking with assignment window
2. Assign sitter
3. Send test SMS from phone
4. Verify in UI

---

## Continuous Integration

### CI Test Commands

```bash
# Unit tests (fast, no external deps)
npm test

# Integration tests (requires DB)
npm run test:integration

# E2E tests (requires server)
npm run test:ui
```

### Test Coverage

```bash
# Generate coverage report
npm test -- --coverage

# View coverage report
open coverage/index.html
```

---

## Additional Resources

- **Quick Test:** `QUICK_TEST_CHECKLIST.md`
- **Manual Steps:** `STAGING_MANUAL_TEST_STEPS.md`
- **Verification:** `MESSAGING_VERIFICATION_CHECKLIST.md`
- **E2E Tests:** `tests/e2e/messaging-features.spec.ts`
- **Integration Tests:** `src/app/api/messages/__tests__/`

---

## Need Help?

If tests are failing or you need help:

1. Check server logs for errors
2. Verify environment variables
3. Check database connectivity
4. Review test output for specific failures
5. Check ngrok/webhook configuration (for manual testing)
