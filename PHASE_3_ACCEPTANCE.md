# Phase 3: Anti-Poaching Enforcement - Acceptance Criteria

**Phase**: 3.1 - 3.3  
**Date**: 2025-01-04  
**Status**: Implementation Complete (Tests Required for Approval)

---

## Phase 3.1: Detection Engine ✅

### Implementation
- **File**: `src/lib/messaging/anti-poaching-detection.ts`
- **Function**: `detectAntiPoachingViolations(content: string)`
- **Output**: Detection result with `detected` boolean and `reasons` array

### Detection Patterns
- ✅ **Phone numbers**: US format, international format, raw digits (10-15 digits)
- ✅ **Email addresses**: Standard email pattern (user@domain.com)
- ✅ **URLs**: HTTP/HTTPS URLs, www. URLs, domain.com/path patterns
- ✅ **Social handles/phrases**: 
  - Instagram, IG, Snapchat, WhatsApp, Telegram
  - "dm me", "text me", "call me", "contact me", "hit me up"
  - "my number", "my phone", "my email"
  - "personal", "private message", "pm me"

### Acceptance Criteria
- ✅ Detects phone numbers in common formats
- ✅ Detects email addresses
- ✅ Detects URLs
- ✅ Detects social media handles and poaching phrases
- ✅ Returns `detected: boolean` and `reasons: string[]`
- ✅ Filters false positives (dates, times, IP addresses)

### Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-3-integration.test.ts
```

### Pass Criteria
- ✅ Phone number detection works
- ✅ Email detection works
- ✅ URL detection works
- ✅ Social media phrase detection works
- ✅ Multiple violations detected
- ✅ False positives filtered

---

## Phase 3.2: Enforcement ✅

### Implementation
- **Files**: 
  - `src/lib/messaging/anti-poaching-enforcement.ts`
  - `src/app/api/messages/send/route.ts` (outbound)
  - `src/app/api/messages/webhook/twilio/route.ts` (inbound)
  - `src/app/api/messages/events/[id]/force-send/route.ts` (owner override)

### Enforcement Points
- ✅ **Outbound sitter send endpoint**: Blocks before sending
- ✅ **Inbound client webhook**: Blocks and sends auto-response warning

### Blocking Behavior
When violation detected:
- ✅ Blocks delivery (no provider send)
- ✅ Creates MessageEvent with `wasBlocked: true`, `antiPoachingFlagged: true` (in metadataJson)
- ✅ Creates AntiPoachingAttempt record linked to MessageEvent
- ✅ Notifies owner via owner inbox thread (redacted summary)
- ✅ Sends friendly warning to sender
- ✅ For inbound SMS: Warning sent as auto-response

### Owner Override
- ✅ Backend endpoint: `POST /api/messages/events/[id]/force-send`
- ✅ Requires explicit reason (logged)
- ✅ Updates MessageEvent with force send flags
- ✅ Updates AntiPoachingAttempt action to 'warned'
- ✅ Resolves attempt with resolvedByUserId

### Acceptance Criteria
- ✅ Sitter outbound with violations blocked (403, no provider send)
- ✅ Client inbound with violations blocked (warning sent)
- ✅ MessageEvent created with blocked flags
- ✅ AntiPoachingAttempt record created
- ✅ Owner notified in owner inbox
- ✅ Warning sent to sender
- ✅ Owner can force send with reason

### Test Command
```bash
npm test -- src/app/api/messages/__tests__/phase-3-integration.test.ts
```

### Pass Criteria
- ✅ Sitter outbound blocked when violations detected
- ✅ Client inbound blocked when violations detected
- ✅ MessageEvent created with `wasBlocked: true` in metadata
- ✅ AntiPoachingAttempt record created and linked
- ✅ Owner notification sent to owner inbox
- ✅ Warning message sent to sender
- ✅ Owner override endpoint works correctly

---

## Phase 3.3: Tests and Proof ✅

### Test Suite
- ✅ `phase-3-integration.test.ts` - Comprehensive Phase 3 integration tests
  - Detection engine tests
  - Sitter outbound enforcement tests
  - Client inbound enforcement tests
  - Owner notification tests
  - Owner override tests

### Proof Script
```bash
npm run proof:phase3
```

**Command**: `npm run proof:phase3`

**What it does**:
1. Runs `npx prisma migrate deploy` (or `npx prisma db push` if needed)
2. Runs `npm run proof:phase1-5` (Phase 1 proof)
3. Runs `npm run proof:phase2` (Phase 2 proof)
4. Runs `npm test -- src/app/api/messages/__tests__/phase-3-integration.test.ts`
5. Prints `PASS` if all checks pass, exits with error code 1 if any fail

### Acceptance Criteria
- ✅ All Phase 3 integration tests pass
- ✅ Detection engine tests pass
- ✅ Enforcement tests pass (sitter and client)
- ✅ Owner notification tests pass
- ✅ Owner override tests pass
- ✅ Proof script prints "PASS"
- ✅ No test failures or errors

---

## Integration Points

### Send Endpoint
- Anti-poaching check before sending
- Blocks with 403 if violations detected
- Creates blocked MessageEvent and AntiPoachingAttempt
- Sends warning to sender
- Owner override via `forceSend` flag (deferred to force-send endpoint)

### Webhook Endpoint
- Anti-poaching check before creating message event
- Blocks inbound message if violations detected
- Sends auto-response warning to client
- Routes blocked message info to owner inbox

### Owner Override
- Endpoint: `POST /api/messages/events/[id]/force-send`
- Body: `{ reason: string }`
- Updates MessageEvent and AntiPoachingAttempt
- Forces message delivery via provider
- Logs override with reason

---

## Known Limitations

1. **Schema Fields**: MessageEvent doesn't have `wasBlocked` and `antiPoachingFlagged` fields yet. Currently stored in `metadataJson`. Schema migration may be needed in future.

2. **Warning Message**: Warning message is configurable via `generateAntiPoachingWarning()`. Future enhancement could pull from settings/env.

3. **Owner Override UI**: Owner override UI is deferred. Backend endpoint exists and can be called directly.

4. **False Positive Filtering**: Some edge cases may still generate false positives (e.g., phone numbers in addresses, URLs in descriptions). Can be refined based on real-world usage.

---

## Next Steps

After Phase 3 acceptance:
- Schema migration for MessageEvent fields (optional)
- Owner override UI
- Enhanced false positive filtering
- Configurable warning messages per org
- Anti-poaching analytics dashboard
