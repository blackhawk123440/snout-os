# Troubleshooting Guide

Common issues and solutions for operators and developers.

---

## 🔴 Provider Connection Issues

### "Provider connection failed"

**Symptoms:**
- Setup wizard Step 2 (Test Connection) fails
- Health check shows provider disconnected
- Messages fail to send

**Causes & Solutions:**

1. **Invalid Twilio Credentials**
   - Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`
   - Check credentials in Twilio Console: https://console.twilio.com
   - Ensure no extra spaces or quotes in env vars

2. **Network/Firewall Issues**
   - Check if API server can reach `api.twilio.com`
   - Verify no corporate firewall blocking outbound HTTPS
   - Test: `curl https://api.twilio.com`

3. **Provider Mode Mismatch**
   - Ensure `PROVIDER_MODE="twilio"` for production
   - Use `PROVIDER_MODE="mock"` only for local development

4. **Account Suspended/Inactive**
   - Check Twilio Console for account status
   - Verify account has sufficient balance

**How to Debug:**
- Enable Diagnostics Mode (Owner-only) in Settings
- Check `/ops` → Health Checks → Provider status
- Review API logs for detailed error messages

---

## 🔴 Webhook Issues

### "Webhook verified=false"

**Symptoms:**
- Inbound messages not appearing
- Status callbacks not updating delivery status
- Webhook installation step fails

**Causes & Solutions:**

1. **Missing/Invalid Auth Token**
   - Verify `TWILIO_WEBHOOK_AUTH_TOKEN` is set in `.env`
   - Must match Twilio Console → Settings → Auth Token
   - Token is different from `TWILIO_AUTH_TOKEN`

2. **Webhook URL Not Configured in Twilio**
   - Go to Twilio Console → Phone Numbers → Your Number
   - Set "A message comes in" webhook URL:
     ```
     https://your-domain.com/webhooks/twilio/inbound-sms
     ```
   - Set "Status callback URL":
     ```
     https://your-domain.com/webhooks/twilio/status-callback
     ```
   - Use HTTPS (not HTTP) in production

3. **Signature Verification Failing**
   - Ensure webhook URL is publicly accessible
   - Check that raw request body is preserved (required for signature verification)
   - Verify CORS allows Twilio origin

4. **Webhook URL Not Reachable**
   - Test webhook URL: `curl -X POST https://your-domain.com/webhooks/twilio/inbound-sms`
   - Check if behind firewall/VPN
   - Verify DNS resolves correctly

**How to Debug:**
- Check `/ops` → Health Checks → "Last Webhook Received"
- Review audit events: `/audit` → Filter by `webhook.inbound_sms.received`
- Enable Diagnostics Mode to see webhook URLs

---

## 🔴 Message Delivery Issues

### "Message failed and retries exhausted"

**Symptoms:**
- Message shows "Failed" status after 3 retry attempts
- Critical alert created: "Message Delivery Failed - Max Retries Exceeded"
- DLQ entry appears in `/ops`

**What Happens:**
1. Message send fails (provider error, network issue, etc.)
2. System automatically retries 3 times with exponential backoff (1min, 5min, 15min)
3. After 3 failures, job moves to Dead-Letter Queue
4. Critical alert is created for owner review

**Solutions:**

1. **Check DLQ and Replay**
   - Navigate to `/ops` → "Dead-Letter Queue"
   - Review failed job details (error message, attempts)
   - If issue is resolved, click "Replay" (enter reason)
   - Job will be re-enqueued for processing

2. **Manual Retry**
   - Go to `/inbox` → Select thread → Find failed message
   - Click "Retry" button (if available)
   - Or use DLQ replay (recommended)

3. **Root Cause Analysis**
   - Check provider connection status
   - Verify recipient phone number is valid
   - Review error code in delivery details:
     - `SEND_FAILED` - Provider rejected send
     - `INVALID_NUMBER` - Recipient number invalid
     - `RATE_LIMIT` - Too many messages sent
     - `ACCOUNT_SUSPENDED` - Twilio account issue

4. **Prevent Future Failures**
   - Fix underlying issue (provider config, number validity)
   - Monitor `/alerts` for recurring failures
   - Review rate limits if hitting limits

**How to Debug:**
- Check message delivery attempts: `/inbox` → Message details
- Review audit events: `/audit` → Filter by `message.outbound.*`
- Check DLQ: `/ops` → Dead-Letter Queue

---

## 🔴 Sitter Access Issues

### "Sitter can't see thread"

**Symptoms:**
- Sitter logs in but sees "No active conversations"
- Thread exists but not visible to sitter
- Error: "This conversation is only available during your assignment window"

**Causes & Solutions:**

1. **No Active Assignment Window**
   - **Most Common**: Thread has no assignment window, or window is not active
   - Go to `/assignments` → Check if thread has active window
   - Create assignment window with:
     - `startsAt` <= now
     - `endsAt` >= now
   - Window must be assigned to the sitter's user account

2. **Window Not Active Yet**
   - Window `startsAt` is in the future
   - Wait until window start time, or edit window to start now

3. **Window Expired**
   - Window `endsAt` is in the past
   - Create new window or extend existing window

4. **Sitter Not Linked to User**
   - Verify sitter record has `userId` set
   - Check that user role is `"sitter"`
   - Ensure sitter is active (`active: true`)

**How to Debug:**
- Check assignment windows: `/assignments` → List view
- Verify window times: Ensure `startsAt <= now <= endsAt`
- Check sitter-user link: Verify sitter record has `userId`
- Review audit events: `/audit` → Filter by `assignment.window.*`

---

## 🔴 Assignment Window Conflicts

### "Overlap prevented"

**Symptoms:**
- Error when creating assignment window: "Overlap detected"
- Conflict warning shown in UI
- Cannot save window

**What It Means:**
- System prevents overlapping assignment windows for the same thread
- Only one sitter can be assigned to a thread at a time
- Windows cannot overlap in time

**Solutions:**

1. **Resolve Conflict**
   - Go to `/assignments` → "Conflicts" view
   - Review conflicting windows
   - Choose action:
     - **Delete** old window (if no longer needed)
     - **Edit** old window to end before new window starts
     - **Cancel** new window creation

2. **Adjust Window Times**
   - Ensure new window `startsAt` is after existing window `endsAt`
   - Or set new window `endsAt` before existing window `startsAt`
   - Leave gap between windows if needed

3. **Use Reassignment Messages**
   - When changing sitter assignment, use "Send Reassignment Message"
   - System will automatically notify client of sitter change
   - Old window can be ended, new window started

**How to Debug:**
- View conflicts: `/assignments` → Conflicts tab
- Check window timeline: Calendar view shows all windows
- Review audit events: `/audit` → Filter by `assignment.window.*`

---

## 🔴 Policy Violations

### "Policy violation blocked"

**Symptoms:**
- Sitter message blocked with error: "This message wasn't sent because it includes contact info"
- Policy violation appears in `/audit` → Policy Violations
- Message shows redacted content

**What It Means:**
- System detected phone number, email, URL, or social handle in message
- **Sitter outbound**: Blocked + routed to owner review (fail-closed)
- **Owner outbound**: Allowed with warning (fail-open)
- **Inbound**: Allowed but flagged

**Solutions:**

1. **For Sitters**
   - Remove contact information from message
   - Use business language: "Contact us through the app" instead of sharing phone/email
   - Message will be blocked until contact info is removed

2. **For Owners**
   - Review violation in `/audit` → Policy Violations
   - Message was sent but flagged
   - Can override if needed (with reason)

3. **Resolve Violation**
   - Go to `/audit` → Policy Violations tab
   - Click on violation → View details
   - Choose action:
     - **Resolve**: Mark as resolved (violation was legitimate, action taken)
     - **Override**: Allow despite violation (with reason)
     - **Dismiss**: Mark as false positive

**How to Debug:**
- View violations: `/audit` → Policy Violations
- Check detected content: Expand violation to see what was detected
- Review audit events: `/audit` → Filter by `policy.violation.*`

---

## 🔴 Number Management Issues

### "No pool numbers available"

**Symptoms:**
- Error when creating new thread: "No pool numbers available"
- All pool numbers are in use or quarantined
- Thread creation fails

**Causes & Solutions:**

1. **All Pool Numbers In Use**
   - Check `/numbers` → Filter by `class: pool` and `status: active`
   - If all are assigned to threads, buy/import more pool numbers
   - Or release numbers from inactive threads

2. **Numbers Quarantined**
   - Check `/numbers` → Filter by `status: quarantined`
   - Quarantined numbers cannot be used until cooldown expires (90 days default)
   - Cannot bypass cooldown (system guardrail)

3. **No Pool Numbers Configured**
   - Go to Setup Wizard → Step 5 (Pool Numbers)
   - Buy or import pool numbers
   - At least one pool number is recommended

**Solutions:**
- **Buy More Numbers**: `/numbers` → "Buy Number" → Select pool number
- **Import Existing**: `/numbers` → "Import Number" → Enter E.164
- **Release From Quarantine**: `/numbers` → Select number → "Release From Quarantine" (only after cooldown)

**How to Debug:**
- Check number inventory: `/numbers` → View all numbers
- Filter by class and status
- Review number lifecycle: Check quarantine dates

---

## 🔴 Export Issues

### "Export too large"

**Symptoms:**
- Error when exporting audit events: "Export exceeds 10,000 events"
- CSV export fails
- Policy violations export fails

**What It Means:**
- System enforces max 10,000 rows per export (per spec requirement)
- Export would exceed limit with current filters

**Solutions:**

1. **Narrow Date Range**
   - Use date filters to reduce time window
   - Export in smaller chunks (e.g., monthly instead of yearly)
   - Example: Export Jan 2024, then Feb 2024 separately

2. **Add Filters**
   - Filter by event type (e.g., only `message.outbound.sent`)
   - Filter by actor type (e.g., only `owner` actions)
   - Filter by entity type (e.g., only `message` events)

3. **Use API Pagination**
   - Instead of export, use API with pagination:
     ```
     GET /api/audit/events?limit=1000&offset=0
     GET /api/audit/events?limit=1000&offset=1000
     ```
   - Combine results programmatically

**How to Debug:**
- Check total count before export (shown in UI)
- Adjust filters until count < 10,000
- Use date range picker to narrow window

---

## 🔴 Routing Issues

### "Why did routing go to owner inbox?"

**Symptoms:**
- Message routed to Owner Inbox instead of sitter
- Sitter expected to receive message but didn't
- Routing decision seems incorrect

**How Routing Works:**
Routing evaluates in fixed order:
1. **Safety blocks** (permissions, policy violations)
2. **Active routing override** (if exists for thread)
3. **Assignment window** (if active for thread)
4. **Default fallback** → Owner Inbox

**Common Reasons:**

1. **No Active Assignment Window**
   - Most common: Thread has no active window
   - Create assignment window in `/assignments`
   - Ensure window is active (startsAt <= now <= endsAt)

2. **Window Not Active Yet**
   - Window `startsAt` is in the future
   - Routing falls back to Owner Inbox until window starts

3. **Window Expired**
   - Window `endsAt` is in the past
   - Routing falls back to Owner Inbox after window ends

4. **Routing Override Active**
   - Check `/routing` → Overrides
   - Active override may force routing to Owner Inbox
   - Remove override if not needed

**How to Debug:**
- **View Routing Trace**: `/routing` → Routing History → Select thread → Expand trace
- Trace shows:
  - Step 1: Thread validation
  - Step 2: Override check (active/not active)
  - Step 3: Assignment window check (active/not active)
  - Step 4: Default fallback → Owner Inbox
- **Check Assignment Windows**: `/assignments` → Verify active window exists
- **Check Overrides**: `/routing` → Overrides → Verify no active override forcing Owner Inbox

---

## 🔴 Queue/Redis Issues

### "Queue stuck / redis down"

**Symptoms:**
- Messages not sending (stuck in queue)
- Retries not processing
- Automation executions not running
- Health check shows queue issues

**Causes & Solutions:**

1. **Redis Not Running**
   - Check: `docker-compose ps` (if using Docker)
   - Start Redis: `docker-compose up -d redis`
   - Verify connection: Check `REDIS_URL` in `.env`

2. **Redis Connection Failed**
   - Verify `REDIS_URL` is correct
   - Check network/firewall allows connection
   - Test: `redis-cli -u $REDIS_URL ping`

3. **Queue Workers Not Running**
   - Workers start automatically with API server
   - Check API server logs for worker initialization
   - Verify `WorkersModule` is imported in `app.module.ts`

4. **Jobs Stuck in Queue**
   - Check `/ops` → Health Checks → Queue Health
   - Review "Waiting" and "Active" counts
   - If stuck, restart API server (workers restart automatically)

**How to Debug:**
- Check Redis: `docker-compose logs redis`
- Check queue health: `/ops` → Health Checks → Queue Health
- Review worker logs: Check API server console output
- Check DLQ: `/ops` → Dead-Letter Queue (failed jobs)

---

## 🔴 General Debugging Tips

### Enable Diagnostics Mode

**Owner-only** feature in Settings:
- Reveals provider IDs (SIDs) in number/message details
- Shows webhook URLs
- Displays raw provider responses

**How to Enable:**
1. Go to `/settings`
2. Toggle "Support Diagnostics" (Owner-only)
3. Refresh page
4. Provider details now visible in number/message views

### Check Audit Events

All system actions are logged:
- Navigate to `/audit` → Audit Timeline
- Filter by event type, actor, entity
- Use correlation IDs to trace related events

### Review Health Checks

System health overview:
- Navigate to `/ops` → Health Checks
- Check provider connection
- Verify last webhook received
- Review queue health
- Check database latency

### Check Alerts

System alerts for issues:
- Navigate to `/alerts`
- Filter by severity (Critical/Warning/Info)
- Review unresolved alerts
- Critical alerts cannot be dismissed (must be resolved)

---

## 📞 Getting Help

If issues persist:
1. Check this troubleshooting guide
2. Review audit events for error details
3. Check health checks for system status
4. Review API server logs
5. Contact support with:
   - Error message
   - Audit event IDs
   - Steps to reproduce
   - Screenshots if applicable

---

**Last Updated**: 2026-01-19
