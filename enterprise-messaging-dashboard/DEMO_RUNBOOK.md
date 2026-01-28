# Demo Runbook - Enterprise Messaging Dashboard

**Version:** 1.0  
**Date:** 2026-01-19  
**Audience:** Non-engineers (product, sales, support)

This runbook provides step-by-step instructions to demonstrate the core capabilities of the Enterprise Messaging Dashboard. Each step proves a key promise of the system.

---

## Prerequisites

1. **Local Environment Running:**
   - API server: `http://localhost:3001`
   - Web app: `http://localhost:3000`
   - Database: PostgreSQL (via Docker Compose)
   - Redis: Running (via Docker Compose)

2. **Seed Data Loaded:**
   - Run: `cd apps/api && pnpm db:seed`
   - This creates:
     - Owner user: `owner@example.com` / `password123`
     - Sitter user: `sitter@example.com` / `password`
     - Clients, sitters, threads, assignment windows, messages

3. **Mock Provider Active:**
   - System should be in "mock provider" mode (default for local dev)
   - No real Twilio credentials needed

---

## Demo Flow

### Step 1: Setup Wizard (Mock Provider)

**Goal:** Show the complete setup flow without touching Twilio.

1. Navigate to `http://localhost:3000/setup`
2. **Step 1 - Connect Provider:**
   - Select "Mock Provider" (should be default)
   - Click "Connect"
   - Should show "Connected" status
3. **Step 2 - Test Connection:**
   - Click "Test Connection"
   - Should show "Connection successful"
4. **Step 3 - Choose Numbers:**
   - Front Desk: Select any number (e.g., `+15551111111`)
   - Sitter Numbers: Select `+15552222222`
   - Pool Numbers: Select `+15553333333`
   - Click "Save Selection"
5. **Step 4 - Buy/Import Numbers (Optional):**
   - Skip this step (numbers already exist in seed)
6. **Step 5 - Install Webhooks (Optional):**
   - Skip this step (mock provider doesn't need webhooks)
7. **Step 6 - Verify Readiness:**
   - Click "Check Readiness"
   - Should show all checks passing
8. **Step 7 - Finish:**
   - Click "Finish Setup"
   - Should redirect to `/dashboard`

**What This Proves:**
- Complete setup flow works end-to-end
- Mock provider allows testing without Twilio
- Business language (no Twilio jargon)

---

### Step 2: Inbound Webhook → Routed to Owner (Trace Visible)

**Goal:** Show deterministic routing with visible trace.

1. Navigate to `/inbox`
2. Look for a thread that routes to "Owner Inbox" (threads without active assignment windows)
3. Click on a thread to view messages
4. **Simulate Inbound Webhook:**
   - Use API or webhook simulator to send:
     ```
     POST http://localhost:3001/webhooks/twilio/inbound-sms
     Body: {
       "MessageSid": "SM123",
       "From": "+15551234567",
       "To": "+15551111111",
       "Body": "Hello, I need help with my booking"
     }
     ```
5. **Verify:**
   - Message appears in Owner Inbox
   - Navigate to `/routing` → "Routing History"
   - Find the routing decision for this thread
   - Click to expand trace
   - Should show:
     - Step 1: Thread validation
     - Step 2: No active override
     - Step 3: No active assignment window → **Route to Owner Inbox**
     - Final target: `owner_inbox`

**What This Proves:**
- Inbound messages are routed deterministically
- Routing trace is stored and visible
- Owner sees messages when no sitter assigned

---

### Step 3: Assign Sitter Window → Sitter Can See Thread

**Goal:** Show assignment window creates sitter access.

1. Navigate to `/assignments`
2. Click "Create Window"
3. **Create Assignment Window:**
   - Thread: Select a thread (e.g., "John Smith")
   - Sitter: Select a sitter (e.g., "Sarah Johnson")
   - Start: Set to 1 hour ago (makes it active now)
   - End: Set to 7 days from now
   - Click "Save Window"
4. **Verify in Owner View:**
   - Navigate to `/inbox`
   - Thread should still be visible to owner
5. **Verify in Sitter View:**
   - Logout as owner
   - Login as sitter: `sitter@example.com` / `password`
   - Navigate to `/sitter/inbox`
   - Should see the thread in the list
   - Click to view messages
   - Should show thread header with "Active now" status

**What This Proves:**
- Assignment windows control sitter access
- Sitters only see threads during active windows
- Owner always has full access

---

### Step 4: Sitter Tries to Message Outside Window → Blocked

**Goal:** Show strict window enforcement.

1. **Create a Future Window:**
   - Logout as sitter, login as owner
   - Navigate to `/assignments`
   - Create a window that starts 1 hour from now (not active yet)
2. **Sitter Tries to Message:**
   - Logout, login as sitter
   - Navigate to `/sitter/inbox`
   - Thread should NOT appear (window not active)
3. **Alternative: Edit Window to Make It Past:**
   - As owner, edit the window to end 1 hour ago
   - As sitter, try to access thread
   - Should show: "This conversation is only available during your assignment window."
4. **Try to Send Message:**
   - If thread is visible but window inactive:
     - Compose box should be disabled
     - Should show: "You can message during your assignment window. Messages outside the window are blocked."

**What This Proves:**
- Sitters cannot access threads outside windows
- UI enforces window restrictions
- Server-side enforcement (cannot bypass)

---

### Step 5: Policy Violation (Phone Number) → Blocked + Owner Review

**Goal:** Show anti-poaching policy enforcement.

1. **Sitter Tries to Send Phone Number:**
   - As sitter, navigate to `/sitter/inbox`
   - Select a thread with active window
   - Type message: "Call me at 555-123-4567"
   - Click "Send"
   - Should show error: "This message wasn't sent because it includes contact info. Please keep communication in the system."
2. **Owner Sees Policy Violation:**
   - Logout, login as owner
   - Navigate to `/audit` → "Policy Violations" tab
   - Should see violation:
     - Type: "phone"
     - Status: "open"
     - Action: "blocked"
   - Click to view details
   - Should show detected content (redacted for non-owners)
3. **Owner Can Override:**
   - Click "Override" or "Resolve"
   - Enter reason
   - Violation is resolved

**What This Proves:**
- Policy violations are detected automatically
- Sitter messages with contact info are blocked
- Owner can review and resolve violations
- All violations are audited

---

### Step 6: Delivery Failure → Retries → Max Retries → Critical Alert + DLQ Entry

**Goal:** Show retry mechanism and dead-letter queue.

1. **Simulate Delivery Failure:**
   - As owner, navigate to `/inbox`
   - Select a thread
   - Send a message
   - (In mock provider, you can configure it to fail)
2. **Check Retry Attempts:**
   - Navigate to `/inbox`
   - Click on the message
   - Should show delivery status: "Failed"
   - Check delivery attempts (should show 3 attempts)
3. **Max Retries Exceeded:**
   - After 3 failed attempts, navigate to `/alerts`
   - Should see critical alert: "Message Delivery Failed - Max Retries Exceeded"
4. **Check DLQ:**
   - Navigate to `/ops` → "Dead Letter Queue" tab
   - Should see failed job:
     - Queue: "message-retry"
     - Name: "retry-message"
     - Failed reason: Error details
     - Entity link: Link to message
5. **Replay Job:**
   - Click "Replay" on the DLQ job
   - Enter reason: "Manual retry after fixing provider issue"
   - Job should be re-enqueued
   - Check `/alerts` - alert should update when job succeeds

**What This Proves:**
- Automatic retries with exponential backoff
- Max retries enforced (3 attempts)
- Critical alerts created on failure
- DLQ viewer shows failed jobs (new `/ops` page)
- Manual replay capability with reason tracking

---

### Step 7: Automation Edit → Activation Blocked Until Test → Test → Activate → Execution Log

**Goal:** Show automation test-before-activate guardrail.

1. **Create/Edit Automation:**
   - Navigate to `/automations`
   - Click "Create Automation" or edit existing
   - Complete the 6-step builder:
     - Step 1: Name, description, lane
     - Step 2: Trigger (e.g., "client.created")
     - Step 3: Conditions (optional)
     - Step 4: Actions (e.g., "sendSMS")
     - Step 5: Templates (message body)
     - Step 6: Review
   - Click "Save Draft"
2. **Try to Activate:**
   - Click "Activate"
   - Should show error: "You must run a successful test before activating this automation."
3. **Run Test:**
   - Click "Test Mode"
   - Should show test execution
   - Check execution log:
     - Status: "test"
     - Condition results: Shown
     - Action results: Simulated (no real sends)
4. **Activate After Test:**
   - After successful test, click "Activate"
   - Should succeed
   - Automation status: "active"
5. **View Execution Logs:**
   - Navigate to automation detail page
   - Click "Execution Logs"
   - Should show:
     - Test execution (status: "test")
     - Real execution (if triggered, status: "success" or "failed")
     - Condition evaluation results
     - Action execution results

**What This Proves:**
- Test mode prevents accidental activation
- Activation requires successful test
- Execution logs show full trace
- Test mode doesn't send real messages

---

### Step 8: Pool Number Reuse Safety → Unmapped Inbound → Owner + Alert

**Goal:** Show pool number reuse protection.

1. **Simulate Unmapped Inbound:**
   - Send webhook for a number that doesn't map to any thread:
     ```
     POST http://localhost:3001/webhooks/twilio/inbound-sms
     Body: {
       "MessageSid": "SM999",
       "From": "+15559876543", // Number not in any thread
       "To": "+15553333333", // Pool number
       "Body": "Hello?"
     }
     ```
2. **Verify Routing:**
   - Navigate to `/inbox`
   - Should see message in Owner Inbox (unmapped thread)
   - Navigate to `/routing` → "Routing History"
   - Should show routing decision:
     - Reason: "Unmapped inbound message - routed to Owner Inbox"
3. **Check Alert:**
   - Navigate to `/alerts`
   - Should see warning alert:
     - Type: "routing.unmapped_inbound"
     - Title: "Unmapped Inbound Message"
     - Description: "Inbound message received for number that doesn't map to any active thread"
4. **Verify Audit:**
   - Navigate to `/audit` → "Audit Timeline"
   - Should see event:
     - Type: "routing.unmapped_inbound"
     - Entity: Thread ID
     - Payload: Includes routing decision

**What This Proves:**
- Unmapped messages route to Owner Inbox (safe default)
- Alerts created for unmapped messages
- Full audit trail
- Pool numbers don't leak to wrong threads

---

## Troubleshooting

### Issue: "No active conversations" in sitter inbox

**Fix:** Ensure assignment window is active (startsAt <= now AND endsAt >= now). Check `/assignments` and create/update window.

### Issue: Message not appearing after webhook

**Fix:** 
1. Check webhook was received: `/ops` → "Health" → "Webhooks" → "Last Received"
2. Check audit events: `/audit` → Look for `webhook.inbound.received`
3. Check routing decision: `/routing` → "Routing History"

### Issue: DLQ shows no jobs

**Fix:** 
1. Ensure Redis is running: `docker-compose ps`
2. Check queue health: `/ops` → "Health Checks" tab → Queue Health section
3. Simulate failure: Send message that will fail (mock provider can be configured to fail)
4. Wait for retries to exhaust (3 attempts with exponential backoff)

### Issue: Automation test fails

**Fix:**
1. Check automation conditions are valid
2. Check trigger context is correct
3. View execution log for error details

---

## Key Metrics to Highlight

- **Routing Determinism:** Every routing decision has a trace
- **Access Control:** Sitters only see active windows
- **Policy Enforcement:** Automatic detection + blocking
- **Retry Reliability:** 3 automatic retries with exponential backoff
- **Audit Completeness:** Every action is logged
- **Masking Invisibility:** Sitters never see real client numbers

---

## Next Steps After Demo

1. **Production Setup:**
   - Configure real Twilio credentials
   - Set up webhook URLs in Twilio console
   - Configure CORS origins
   - Set up rate limiting thresholds

2. **Monitoring:**
   - Check `/ops` regularly for DLQ jobs
   - Monitor `/alerts` for critical issues
   - Review `/audit` for compliance

3. **Training:**
   - Train owners on assignment windows
   - Train sitters on window restrictions
   - Train support on DLQ replay process

---

**End of Demo Runbook**
