# Rollout Phase 1: Messaging V1 Production Deployment

**Date**: 2025-01-04  
**Status**: Pre-Rollout (Diagnostics Ready)

---

## Overview

This document provides step-by-step instructions for rolling out SnoutOS Messaging V1 to production. All features are behind feature flags for zero-risk deployment.

---

## Feature Flags

- **`ENABLE_MESSAGING_V1`** (default: false) - Core messaging infrastructure
- **`ENABLE_PROACTIVE_THREAD_CREATION`** (default: false) - Phase 4.3: Proactive thread/window creation
- **`ENABLE_SITTER_MESSAGES_V1`** (default: false) - Phase 4.2: Sitter messages UI

---

## Pre-Rollout Checklist

### Diagnostics Endpoint

- [ ] **GET /api/messages/diagnostics** accessible (owner/admin only)
- [ ] Verify thread counts by numberClass
- [ ] Verify anti-poaching blocked count
- [ ] Verify owner inbox routed count
- [ ] Verify routing decisions show redacted phone numbers
- [ ] Verify feature flags status

**Test Command:**
```bash
curl -H "Authorization: Bearer <token>" https://<domain>/api/messages/diagnostics
```

### Logging Hygiene

- [ ] All phone numbers in logs are redacted (last 4 digits only)
- [ ] No raw E.164 numbers in console.log/error/warn
- [ ] Webhook logs use `createWebhookLogEntry` with redaction

### Database

- [ ] Phase 1.4 migration completed (front desk numbers, thread-number associations)
- [ ] Phase 1.5 proof script passes
- [ ] All threads have `messageNumberId` assigned

### Environment Variables

- [ ] `TWILIO_ACCOUNT_SID` set
- [ ] `TWILIO_AUTH_TOKEN` set
- [ ] `TWILIO_PROXY_SERVICE_SID` set
- [ ] `TWILIO_WEBHOOK_URL` set (matches actual webhook URL exactly)
- [ ] `TWILIO_WEBHOOK_AUTH_TOKEN` set (if used)
- [ ] `PUBLIC_BASE_URL` or `WEBHOOK_BASE_URL` set

---

## Staging Enable Flags

### Step 1: Enable Core Messaging (Staging)

1. **Set environment variable:**
   ```bash
   ENABLE_MESSAGING_V1=true
   ```

2. **Verify:**
   - [ ] `/messages` page loads (owner UI)
   - [ ] Thread list shows existing threads
   - [ ] Can send test message from owner UI
   - [ ] Inbound webhook creates thread and message
   - [ ] Diagnostics endpoint shows thread counts

3. **Monitor:**
   - [ ] Check diagnostics endpoint every 15 minutes
   - [ ] Verify no errors in logs
   - [ ] Verify phone numbers are redacted in logs

### Step 2: Enable Proactive Thread Creation (Staging)

**Prerequisite:** Step 1 stable for 24 hours

1. **Set environment variable:**
   ```bash
   ENABLE_PROACTIVE_THREAD_CREATION=true
   ```

2. **Manual Acceptance Test:**
   - [ ] Assign sitter to **weekly** booking
   - [ ] Confirm thread appears **immediately** in owner messages
   - [ ] Confirm **window status** shows correctly in thread header
   - [ ] Send message from owner
   - [ ] Confirm it **routes correctly** (delivered, thread updated)

3. **Monitor:**
   - [ ] Check diagnostics: thread counts increase for recurring clients
   - [ ] Verify no duplicate threads created
   - [ ] Verify assignment windows created correctly

### Step 3: Enable Sitter Messages (Staging)

**Prerequisite:** Step 2 stable for 24 hours

1. **Set environment variable:**
   ```bash
   ENABLE_SITTER_MESSAGES_V1=true
   ```

2. **Manual Acceptance Test:**
   - [ ] Log in as sitter
   - [ ] Open `/messages` - see only Conversations tab (no Owner Inbox)
   - [ ] List shows only assigned threads with active/upcoming window
   - [ ] Open thread - verify window status in header
   - [ ] If outside window: composer disabled, friendly message with next window
   - [ ] If inside window: send message, verify delivery
   - [ ] Send message that triggers anti-poaching - verify friendly warning only

3. **Monitor:**
   - [ ] Check diagnostics: sitter blocked count (no active window)
   - [ ] Verify sitter can only see assigned threads
   - [ ] Verify no owner inbox or billing threads visible to sitter

---

## Production Pilot Rollout

### Pilot Group Selection

- [ ] Select 1-2 pilot organizations
- [ ] Ensure pilot orgs have:
  - Active weekly clients
  - Active sitters
  - Owner/admin access for monitoring

### Pilot Enable Sequence

**Day 1: Core Messaging**
1. Enable `ENABLE_MESSAGING_V1=true` for pilot orgs only (if org-scoped flags) OR enable globally
2. Monitor diagnostics endpoint every 30 minutes
3. Owner acceptance: send/receive test messages

**Day 2-3: Monitor**
- [ ] Check diagnostics daily
- [ ] Review routing decisions (last 50)
- [ ] Verify anti-poaching blocking works
- [ ] Verify owner inbox routing works

**Day 4: Proactive Thread Creation**
1. Enable `ENABLE_PROACTIVE_THREAD_CREATION=true`
2. Run manual acceptance test (weekly booking assignment)
3. Monitor for duplicate threads

**Day 5-6: Monitor**
- [ ] Check thread counts increase appropriately
- [ ] Verify no duplicate threads
- [ ] Verify windows created correctly

**Day 7: Sitter Messages**
1. Enable `ENABLE_SITTER_MESSAGES_V1=true`
2. Run manual sitter UI acceptance test
3. Monitor sitter blocked count

**Day 8-10: Monitor**
- [ ] Check diagnostics daily
- [ ] Verify sitter filtering works
- [ ] Verify send gating works
- [ ] Verify anti-poaching friendly warnings

### Pilot Success Criteria

- [ ] Zero critical errors in logs
- [ ] All phone numbers redacted in logs
- [ ] Thread counts match expectations
- [ ] Owner inbox routing works
- [ ] Anti-poaching blocking works
- [ ] Sitter filtering and gating work
- [ ] Manual acceptance tests pass

---

## Full Production Rollout

**Prerequisite:** Pilot stable for 7 days

1. **Enable flags globally:**
   ```bash
   ENABLE_MESSAGING_V1=true
   ENABLE_PROACTIVE_THREAD_CREATION=true
   ENABLE_SITTER_MESSAGES_V1=true
   ```

2. **Monitor:**
   - [ ] Check diagnostics endpoint every hour for first 24 hours
   - [ ] Review routing decisions daily
   - [ ] Monitor anti-poaching blocked count
   - [ ] Monitor sitter blocked count

3. **Communication:**
   - [ ] Notify owners of new messaging features
   - [ ] Notify sitters of messaging access (when enabled)
   - [ ] Provide support documentation

---

## Rollback Steps

### Single Flag Flips

**Rollback Core Messaging:**
```bash
ENABLE_MESSAGING_V1=false
```
- Effect: All messaging endpoints return 404
- Owner UI `/messages` hidden
- Webhooks still accepted but no processing

**Rollback Proactive Thread Creation:**
```bash
ENABLE_PROACTIVE_THREAD_CREATION=false
```
- Effect: No threads created on booking assignment
- Existing threads remain functional
- First-message edge cases return (threads created on first message)

**Rollback Sitter Messages:**
```bash
ENABLE_SITTER_MESSAGES_V1=false
```
- Effect: Sitters receive 404 on messaging endpoints
- Owner messaging remains functional
- Sitters cannot access `/messages`

### Full Rollback

If critical issues occur:

1. **Disable all flags:**
   ```bash
   ENABLE_MESSAGING_V1=false
   ENABLE_PROACTIVE_THREAD_CREATION=false
   ENABLE_SITTER_MESSAGES_V1=false
   ```

2. **Verify:**
   - [ ] All messaging endpoints return 404
   - [ ] Owner UI `/messages` hidden
   - [ ] No new threads created
   - [ ] Existing threads remain in database (for recovery)

3. **Investigate:**
   - [ ] Review diagnostics endpoint data
   - [ ] Review routing decisions
   - [ ] Check logs for errors
   - [ ] Identify root cause

4. **Recovery:**
   - [ ] Fix issues
   - [ ] Re-run Phase 1.4 migration if needed
   - [ ] Re-enable flags one at a time

---

## Monitoring

### Diagnostics Endpoint

**GET /api/messages/diagnostics**

Returns:
- Thread counts by numberClass
- Anti-poaching blocked count
- Owner inbox routed count
- Sitter no active window count
- Last 50 routing decisions (redacted)
- Feature flags status

**Frequency:**
- During rollout: Every 30 minutes
- Post-rollout: Daily

### Key Metrics

- **Thread count by numberClass**: Should match expected distribution
- **Anti-poaching blocked**: Monitor for spikes (may indicate false positives)
- **Owner inbox routed**: Should be low (most messages route to sitters)
- **Sitter no active window**: Should be low (most sitter sends during windows)

### Log Monitoring

- [ ] All phone numbers redacted (last 4 digits only)
- [ ] No raw E.164 in console output
- [ ] Webhook logs include orgId, threadId, routing decision
- [ ] Error logs include context (orgId, threadId, etc.)

---

## Support

### Common Issues

**Issue: Thread not appearing after booking assignment**
- Check `ENABLE_PROACTIVE_THREAD_CREATION` flag
- Check client classification (must be recurring)
- Check diagnostics: thread counts

**Issue: Sitter cannot send message**
- Check `ENABLE_SITTER_MESSAGES_V1` flag
- Check assignment window (must be active)
- Check diagnostics: sitter no active window count

**Issue: Message blocked by anti-poaching**
- Check diagnostics: anti-poaching blocked count
- Owner can force-send from UI
- Review violation types in audit logs

**Issue: Phone numbers in logs**
- Verify `redactPhoneNumber` used in all logging
- Check webhook logs use `createWebhookLogEntry`
- Review console.log statements

---

## Acceptance Sign-Off

### Staging

- [ ] Core messaging stable for 24 hours
- [ ] Proactive thread creation stable for 24 hours
- [ ] Sitter messages stable for 24 hours
- [ ] All manual acceptance tests pass
- [ ] Diagnostics endpoint shows expected data
- [ ] No phone numbers in logs

### Pilot

- [ ] Pilot stable for 7 days
- [ ] Zero critical errors
- [ ] All acceptance tests pass
- [ ] Owner and sitter feedback positive

### Production

- [ ] Full rollout complete
- [ ] Monitoring in place
- [ ] Support documentation ready
- [ ] Rollback plan tested

---

## Next Steps After Rollout

1. Monitor diagnostics daily for first week
2. Gather owner and sitter feedback
3. Review anti-poaching false positive rate
4. Optimize assignment window buffers if needed
5. Plan Phase 5 enhancements (if any)
