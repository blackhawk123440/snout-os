# Step 2 Execution Guide: Three Manual Checks

**Date**: 2025-01-04  
**Status**: Ready for Execution

---

## Prerequisites

- [ ] Staging environment running
- [ ] `ENABLE_MESSAGING_V1=true` (other flags off)
- [ ] Owner account logged in
- [ ] Test phone number available
- [ ] Access to diagnostics endpoint

---

## Check 1: Weekly Booking Assignment

### Setup
1. Create or find a **weekly booking** (client must be classified as recurring)
2. Ensure booking has a **future start time** (so window can be created)

### Execute
1. **Assign a sitter** to the booking via booking PATCH endpoint or UI
2. **Immediately** open `/messages` as owner
3. **Look for** the thread for that booking + client

### Capture
- [ ] **Screenshot**: Owner messages thread header showing:
  - Window status (active or next window)
  - Assigned sitter name
  - Number class badge
- [ ] **Verify**: Thread appears **immediately** (no message sent yet)
- [ ] **Send test message** from owner in the thread
- [ ] **Verify**: Message delivered, thread updated

### Diagnostics
After check, hit diagnostics endpoint:
```bash
curl -H "Authorization: Bearer <token>" https://<staging>/api/messages/diagnostics | jq '.summary, .routingDecisions.decisions[0:10]'
```

**Record**:
- `ownerInboxRoutedOperational`: ___
- `antiPoachingBlocked`: ___
- Last 10 routing decisions with reasons: ___

---

## Check 2: Outside Window Routing

### Setup
1. Find or create a thread **assigned to a sitter**
2. **Ensure no active assignment window**:
   - Window expired (endAt < now)
   - OR no window exists yet
   - OR window hasn't started (startAt > now)

### Execute
1. **Send a test message from client phone** to the thread's number
2. **Check owner inbox** (`/messages` → Owner Inbox tab)
3. **Check sitter view** (if accessible) - should NOT see the message

### Capture
- [ ] **Screenshot**: Owner inbox entry showing:
  - Message from client
  - Routing reason (if visible in UI)
  - Timestamp
- [ ] **Verify**: Message in owner inbox thread
- [ ] **Verify**: Sitter does NOT see it (if sitter UI accessible)
- [ ] **Verify**: Client doesn't get ignored (owner sees it instantly)

### Diagnostics
After check, hit diagnostics endpoint:
```bash
curl -H "Authorization: Bearer <token>" https://<staging>/api/messages/diagnostics | jq '.summary, .routingDecisions.decisions[0:10]'
```

**Record**:
- `ownerInboxRoutedOperational`: ___
- `antiPoachingBlocked`: ___
- Last 10 routing decisions with reasons: ___
- Look for routing decision with `routingTarget: "owner_inbox"` and `routingReason` containing "No active assignment window"

---

## Check 3: Pool Mismatch

### Setup
1. Find or create a thread using a **pool number**
2. Note the **client's phone number** for that thread
3. Have a **different phone number** ready (not the client's)

### Execute
1. **Send a message from the different phone number** to the pool number
2. **Check owner inbox** for the message
3. **Check your phone** (the different number) for auto-response

### Capture
- [ ] **Screenshot**: Owner inbox entry showing:
  - Message from unknown sender (different phone)
  - Routing reason showing "pool mismatch" or similar
- [ ] **Screenshot**: Auto-response on your phone showing booking link/front desk contact
- [ ] **Verify**: Message in owner inbox
- [ ] **Verify**: Auto-response sent to sender
- [ ] **Verify**: No cross-contamination (message NOT in original client's thread)

### Diagnostics
After check, hit diagnostics endpoint:
```bash
curl -H "Authorization: Bearer <token>" https://<staging>/api/messages/diagnostics | jq '.summary, .routingDecisions.decisions[0:10]'
```

**Record**:
- `ownerInboxRoutedOperational`: ___
- `antiPoachingBlocked`: ___
- Last 10 routing decisions with reasons: ___
- Look for routing decision with `routingTarget: "owner_inbox"` and `routingReason` containing "pool mismatch" or "Sender not mapped"

---

## Extra: Anti-Poaching Smoke Test

### Setup
- [ ] Sitter account logged in (or simulate sitter send)

### Execute
1. **From sitter UI** (or send endpoint as sitter), try to send: `"text me at 256 555 1234"`
2. **Observe** the response

### Verify
- [ ] **Blocked**: Message does not send
- [ ] **Sitter sees**: Generic friendly warning (no violation details, no client data)
- [ ] **Owner gets**: Flagged event (check owner inbox or diagnostics)
- [ ] **No provider send**: Verify no actual SMS sent (check Twilio logs or provider dashboard)

### Expected Sitter Message
> "Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles. Use the app for all client communication."

---

## Results Template

### Step 2 Result
- [ ] **PASS** - All three checks passed
- [ ] **FAIL** - One or more checks failed

### If FAIL
**Which check failed**: ___
**What happened**: ___

### Routing Reasons Observed
**Last 10 routing decisions** (from diagnostics):
```
1. routingTarget: ___, routingReason: ___
2. routingTarget: ___, routingReason: ___
3. routingTarget: ___, routingReason: ___
...
```

### Client Wording Feedback
**Any confusing wording** as a client:
- Auto-response text: ___
- Error messages: ___
- Other: ___

### Diagnostics Snapshots

**After Check 1 (Weekly Booking)**:
- `ownerInboxRoutedOperational`: ___
- `antiPoachingBlocked`: ___

**After Check 2 (Outside Window)**:
- `ownerInboxRoutedOperational`: ___
- `antiPoachingBlocked`: ___

**After Check 3 (Pool Mismatch)**:
- `ownerInboxRoutedOperational`: ___
- `antiPoachingBlocked`: ___

---

## Pass Criteria

### Weekly Booking Assignment
- [x] Thread appears immediately
- [x] Window status shows (next or active)
- [x] Owner can message and it lands in thread

### Outside Window Routing
- [x] Client texts outside window
- [x] Owner inbox receives it
- [x] No sitter sees it
- [x] Client doesn't get ignored, owner sees it instantly

### Pool Mismatch
- [x] Old client texts reused pool number
- [x] Owner inbox gets it with reason pool mismatch
- [x] Old client gets the "book again" response
- [x] No cross contamination into current client thread

---

## Rollback if Fail

If any check fails:
1. **Set**: `ENABLE_MESSAGING_V1=false`
2. **Document**: Which check failed and what happened
3. **Fix**: Address the issue
4. **Retest**: Re-run the failed check

---

## Next Steps

After completing Step 2:
1. Fill out results template above
2. Report back with:
   - Step 2 result: pass or fail
   - If fail: which check and what happened
   - Routing reasons from last 10 decisions
   - Any confusing client wording
3. Wait for approval before proceeding to Step 3
