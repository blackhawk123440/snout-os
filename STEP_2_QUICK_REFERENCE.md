# Step 2 Quick Reference

**For quick execution - full details in STEP_2_EXECUTION_GUIDE.md**

---

## Quick Checklist

### Check 1: Weekly Booking Assignment
1. Assign sitter to weekly booking
2. Open `/messages` - thread should appear immediately
3. Screenshot: Thread header (window status, assigned sitter)
4. Send test message from owner
5. Hit diagnostics: `GET /api/messages/diagnostics`

### Check 2: Outside Window Routing
1. Find thread with assigned sitter, no active window
2. Send message from client phone to thread number
3. Check owner inbox - message should be there
4. Screenshot: Owner inbox entry
5. Hit diagnostics: `GET /api/messages/diagnostics`

### Check 3: Pool Mismatch
1. Find pool number thread
2. Send message from different phone (not client's)
3. Check owner inbox - message with pool mismatch reason
4. Check your phone - auto-response received
5. Screenshot: Owner inbox entry + phone auto-response
6. Hit diagnostics: `GET /api/messages/diagnostics`

### Extra: Anti-Poaching
1. As sitter, try to send: "text me at 256 555 1234"
2. Verify: Blocked, friendly message, owner flagged, no provider send

---

## Diagnostics Command

```bash
curl -H "Authorization: Bearer <token>" \
  https://<staging>/api/messages/diagnostics | \
  jq '{
    ownerInboxRoutedOperational: .summary.ownerInboxRoutedOperational,
    antiPoachingBlocked: .summary.antiPoachingBlocked,
    last10Routing: .routingDecisions.decisions[0:10] | map({timestamp, routingTarget, routingReason})
  }'
```

---

## What to Report

After Step 2, reply with:

1. **Step 2 result**: pass or fail
2. **If fail**: which check failed and what happened
3. **Routing reasons**: Last 10 routing decisions with reasons
4. **Client wording**: Any confusing wording as a client

---

## Pass Criteria Summary

- ✅ Weekly booking: Thread appears immediately, window status shows
- ✅ Outside window: Routes to owner inbox, sitter doesn't see it
- ✅ Pool mismatch: Routes to owner inbox, auto-response sent, no cross-contamination
