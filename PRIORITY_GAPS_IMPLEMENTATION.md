# Priority Gaps Implementation Plan

**Date**: 2024-12-30  
**Status**: Planning  
**Goal**: Implement high-priority security and money truth features from master spec

---

## Priority 1: Webhook Signature Validation

### Current State
- `ENABLE_WEBHOOK_VALIDATION` flag exists but defaults to `false`
- No actual signature validation logic implemented
- Master Spec Section 4.3.3: "Webhook validation must be enabled in production"
- Epic 12.2.4: "Validate webhooks and lock down secrets"

### Implementation Plan
1. **Stripe Webhook Validation**
   - Use Stripe webhook signature verification
   - Verify signature using `STRIPE_WEBHOOK_SECRET` env var
   - Reject requests with invalid signatures when flag enabled
   - Log validation failures to EventLog

2. **SMS Provider Webhook Validation**
   - Implement signature/token validation for SMS webhook provider
   - Use provider-specific secret (OpenPhone or other)
   - Reject invalid requests when flag enabled
   - Log validation failures to EventLog

3. **Idempotency**
   - Ensure webhook handlers are idempotent (already done for Stripe)
   - Add idempotency checks for SMS webhooks

### Files to Modify
- `src/app/api/webhooks/stripe/route.ts` - Add signature verification
- `src/app/api/webhooks/sms/route.ts` - Add signature verification (if exists)
- `src/lib/env.ts` - Add `STRIPE_WEBHOOK_SECRET` env var
- `src/lib/webhook-validation.ts` - New helper file for validation logic

---

## Priority 2: Price Reconciliation Job

### Current State
- Pricing parity harness exists but no scheduled job
- Master Spec Section 5.3: "A reconciliation job compares stored snapshot totals with recompute totals and flags drift"
- Epic 12.3.5: "Pricing drift reconciliation and exception reporting"

### Implementation Plan
1. **Reconciliation Worker**
   - Create scheduled job to run daily/weekly
   - Compare `pricingSnapshot` totals vs recomputed totals
   - Flag bookings with drift above threshold
   - Log drift to EventLog
   - Create exception entries for drifted bookings

2. **Drift Detection Logic**
   - For bookings with `pricingSnapshot`, deserialize and get stored total
   - Recompute using pricing engine
   - Compare totals (allow small floating point differences)
   - Flag if difference exceeds threshold (e.g., $0.01)

3. **Exception Queue Integration**
   - Add "pricing_drift" exception type
   - Link to existing exception queue UI
   - Show drift amount and booking details

### Files to Create/Modify
- `src/worker/reconciliation-worker.ts` - New reconciliation job
- `src/lib/pricing-reconciliation.ts` - New helper for drift detection
- `src/app/api/exceptions/route.ts` - Add pricing_drift exception type
- `src/app/exceptions/page.tsx` - Display pricing drift exceptions
- `src/lib/queue.ts` - Add reconciliation job scheduling

---

## Priority 3: Booking Status History

### Current State
- No StatusHistory model or tracking
- Master Spec Section 3.3.3: "Booking status history is immutable and stored"

### Implementation Plan
1. **Database Schema**
   - Add `BookingStatusHistory` model to Prisma schema
   - Fields: id, bookingId, fromStatus, toStatus, changedBy (userId), reason, metadata, createdAt
   - Create migration

2. **Status Change Tracking**
   - Intercept all status changes in booking update routes
   - Create StatusHistory entry on status change
   - Store previous status, new status, user who made change, timestamp

3. **Status History API**
   - Create endpoint to fetch status history for a booking
   - Add to booking details view

### Files to Create/Modify
- `prisma/schema.prisma` - Add BookingStatusHistory model
- `src/lib/booking-status-history.ts` - Helper to log status changes
- `src/app/api/bookings/[id]/status-history/route.ts` - New endpoint
- `src/app/api/bookings/[id]/route.ts` - Add status history logging
- `src/app/bookings/page.tsx` - Display status history in booking details

---

## Implementation Order

1. **Phase 7.1: Webhook Validation** (Security - Critical)
2. **Phase 7.2: Price Reconciliation** (Money Truth - High Priority)
3. **Phase 7.3: Booking Status History** (Audit Trail - High Priority)

All implementations will follow the same pattern:
- Feature flags (default false)
- Backward compatible
- Comprehensive logging
- EventLog integration
- Type-safe

---

## Success Criteria

### Webhook Validation
- ✅ Stripe webhooks validated when flag enabled
- ✅ SMS webhooks validated when flag enabled
- ✅ Invalid signatures rejected with 401/403
- ✅ Validation failures logged to EventLog
- ✅ Zero breaking changes when flag is false

### Price Reconciliation
- ✅ Scheduled job runs daily/weekly
- ✅ Detects pricing drift accurately
- ✅ Creates exception entries for drifted bookings
- ✅ Shows in exception queue UI
- ✅ Does not modify bookings (read-only detection)

### Booking Status History
- ✅ All status changes tracked
- ✅ History immutable (no updates/deletes)
- ✅ API endpoint to fetch history
- ✅ Display in booking details UI
- ✅ Includes user who made change and timestamp

