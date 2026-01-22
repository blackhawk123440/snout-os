# What To Do Now: Step 2 Execution

**Follow these steps in order. Take screenshots and record diagnostics as you go.**

---

## Step 1: Set Staging Flags

In your staging environment, set:
```bash
ENABLE_MESSAGING_V1=true
ENABLE_PROACTIVE_THREAD_CREATION=false
ENABLE_SITTER_MESSAGES_V1=false
```

Restart your staging server if needed.

---

## Step 2: Check 1 - Weekly Booking Assignment

### What to do:
1. **Create or find a weekly booking** (client must be recurring/weekly, not one-time)
2. **Assign a sitter** to that booking (via booking UI or API)
3. **Immediately open** `/messages` as owner
4. **Look for** the thread for that booking + client

### What should happen:
- ✅ Thread appears **immediately** (no message sent yet)
- ✅ Thread header shows **window status** (active or next window)
- ✅ Thread header shows **assigned sitter name**

### Capture:
- [ ] **Screenshot**: Thread header showing window status and assigned sitter
- [ ] **Send a test message** from owner in that thread
- [ ] **Verify**: Message delivered

### Get diagnostics:
```bash
curl -H "Authorization: Bearer <your-token>" \
  https://<your-staging-url>/api/messages/diagnostics | \
  jq '{
    ownerInboxRoutedOperational: .summary.ownerInboxRoutedOperational,
    antiPoachingBlocked: .summary.antiPoachingBlocked,
    last10Routing: .routingDecisions.decisions[0:10] | map({timestamp, routingTarget, routingReason})
  }'
```

**Record the numbers** somewhere.

---

## Step 3: Check 2 - Outside Window Routing

### What to do:
1. **Find a thread** that has an assigned sitter
2. **Make sure there's NO active window**:
   - Window expired (past end time)
   - OR no window exists
   - OR window hasn't started yet (future start time)
3. **Send a text message** from your test phone to that thread's number
4. **Check owner inbox** (`/messages` → Owner Inbox tab)

### What should happen:
- ✅ Message appears in **owner inbox** (not in the original thread)
- ✅ Sitter does NOT see it
- ✅ Owner sees it instantly

### Capture:
- [ ] **Screenshot**: Owner inbox entry showing the message
- [ ] **Verify**: Message is in owner inbox thread, not original thread

### Get diagnostics:
Run the same diagnostics command again, record the numbers.

---

## Step 4: Check 3 - Pool Mismatch

### What to do:
1. **Find a thread using a pool number** (or create one)
2. **Note the client's phone** for that thread
3. **Use a DIFFERENT phone number** (not the client's)
4. **Send a message** from that different phone to the pool number
5. **Check your phone** for auto-response
6. **Check owner inbox** for the message

### What should happen:
- ✅ Message appears in **owner inbox** with pool mismatch reason
- ✅ **Auto-response sent** to your phone (different number)
- ✅ Auto-response mentions booking link or front desk contact
- ✅ Message does NOT appear in original client's thread

### Capture:
- [ ] **Screenshot**: Owner inbox entry showing pool mismatch message
- [ ] **Screenshot**: Auto-response on your phone

### Get diagnostics:
Run the same diagnostics command again, record the numbers.

---

## Step 5: Extra - Anti-Poaching Test

### What to do:
1. **Log in as sitter** (or simulate sitter send)
2. **Try to send**: "text me at 256 555 1234"
3. **Observe** what happens

### What should happen:
- ✅ Message **blocked** (doesn't send)
- ✅ Sitter sees **friendly message**: "Your message could not be sent. Please avoid sharing phone numbers..."
- ✅ **No violation details** shown to sitter
- ✅ Owner gets flagged (check owner inbox or diagnostics)

---

## Step 6: Report Back

Fill out this template and send it back:

```
Step 2 Result: [PASS / FAIL]

If FAIL:
- Which check failed: [Check 1 / Check 2 / Check 3 / Extra]
- What happened: [describe]

Routing Reasons (last 10 from diagnostics):
1. routingTarget: ___, routingReason: ___
2. routingTarget: ___, routingReason: ___
[... etc ...]

Client Wording Feedback:
- Auto-response text: [confusing / clear / suggestions]
- Error messages: [confusing / clear / suggestions]
- Other: [any feedback]

Diagnostics Numbers:
- After Check 1: ownerInboxRoutedOperational: ___, antiPoachingBlocked: ___
- After Check 2: ownerInboxRoutedOperational: ___, antiPoachingBlocked: ___
- After Check 3: ownerInboxRoutedOperational: ___, antiPoachingBlocked: ___
```

---

## If Anything Fails

**STOP. Do not continue.**

1. **Set**: `ENABLE_MESSAGING_V1=false`
2. **Tell me**: Which check failed and what happened
3. **Wait**: For me to fix it before retesting

---

## Quick Diagnostics Command

Save this and run it after each check:

```bash
curl -H "Authorization: Bearer <your-token>" \
  https://<your-staging-url>/api/messages/diagnostics | \
  jq '{
    ownerInboxRoutedOperational: .summary.ownerInboxRoutedOperational,
    antiPoachingBlocked: .summary.antiPoachingBlocked,
    last10Routing: .routingDecisions.decisions[0:10] | map({timestamp, routingTarget, routingReason})
  }'
```

Replace:
- `<your-token>` with your auth token
- `<your-staging-url>` with your staging domain

---

## That's It!

Do these 6 steps, capture screenshots, record diagnostics, and report back. I'll tell you if you should proceed to Step 3 or if we need to fix anything first.
