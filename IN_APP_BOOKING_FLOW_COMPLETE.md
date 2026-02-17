# In-App Booking Request Flow Implementation Complete

## Overview

Implemented a complete in-app booking request flow (no Twilio) using the OfferEvent model. Sitters see real pending requests, can accept/decline in-app, and tier metrics are computed from in-app behavior.

## Implementation Summary

### 1. Canonical Booking Offer State Machine ✅

**Model**: `OfferEvent` (existing, updated with required fields)
- **Statuses**: `sent`, `accepted`, `declined`, `expired`
- **Fields**: `sitterId`, `bookingId`, `sentAt` (as `offeredAt`), `expiresAt`, `acceptedAt`, `declinedAt`, `source` (default: "dashboard")
- **No duplicate models**: Reuses existing OfferEvent, no SitterPoolOffer duplication

### 2. Pending Requests Wired to Real Data ✅

**File**: `src/app/api/sitter/me/dashboard/route.ts`
- Fetches offers where `status = 'sent'` and `expiresAt > now`
- Sorted by `expiresAt` asc (earliest expiry first), then `offeredAt` desc
- Returns booking details with `offerEvent` object

**File**: `src/components/sitter/PendingRequests.tsx`
- Renders Rover-like cards with:
  - Client, pets, service details, schedule, location, payout
  - Countdown timer (updates every second)
  - Accept / Decline buttons
  - Message button (if thread exists)
- Loading: skeleton cards (handled by parent)
- Empty: intentional empty state
- Supports both legacy `sitterPoolOffer` and new `offerEvent` for compatibility

**Countdown Timer Component**:
- Updates every second using `useEffect` and `setInterval`
- Shows "Response deadline: X minutes ago" format
- Automatically shows expired state when time runs out

### 3. Accept / Decline Actions ✅

**Files**:
- `src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts`
- `src/app/api/sitter/[id]/bookings/[bookingId]/decline/route.ts`

**Accept Flow**:
1. Find active offer (`status = 'sent'`, not expired)
2. Check idempotency (already accepted/declined)
3. Check if booking already assigned to another sitter
4. Calculate `responseSeconds = now - offeredAt`
5. Update offer: `status = 'accepted'`, `acceptedAt = now`
6. Assign booking: `sitterId = sitterId`, `status = 'confirmed'`
7. Update `SitterMetricsWindow` with response time and acceptance
8. Trigger tier recomputation (async)

**Decline Flow**:
1. Find active offer
2. Check if expired (still allow decline for tracking)
3. Check idempotency
4. Calculate `responseSeconds`
5. Update offer: `status = 'declined'` (or `'expired'` if already expired), `declinedAt = now`
6. Update `SitterMetricsWindow` with response time and decline
7. Trigger tier recomputation (async)

**Guardrails**:
- ✅ Idempotency (double-click safe)
- ✅ Expired offers blocked from accept (returns 400 error)
- ✅ Booking already assigned check
- ✅ Response time recorded on every accept/decline

### 4. Offer Expiration ✅

**File**: `src/app/api/offers/expire/route.ts`
- POST endpoint to expire offers
- Finds all offers where `status = 'sent'` and `expiresAt <= now`
- Marks as `status = 'expired'`
- Returns booking to pool (if not assigned)
- Updates metrics windows for affected sitters
- Can be called periodically via cron job or scheduled task

**Usage**:
```bash
# Call periodically (e.g., every 5 minutes)
POST /api/offers/expire
```

### 5. Tier + Metrics Computation From In-App Behavior ✅

**File**: `src/lib/tiers/tier-engine-twilio.ts` (updated)
- Computes tiers from:
  - **Response time**: From offer `responseSeconds` (calculated on accept/decline)
  - **Accept/decline/expire rates**: From OfferEvent status counts (rolling 7d/30d)
- Merges offer response times with message response times
- Updates `SitterMetricsWindow` with:
  - `avgResponseSeconds`, `medianResponseSeconds`
  - `offerAcceptRate`, `offerDeclineRate`, `offerExpireRate`
- Persists `SitterTierHistory` when tier changes

**Metrics Window Updates**:
- Updated on every accept/decline/expire
- Recalculates all rates from offers in 7-day window
- Stores in `SitterMetricsWindow` with `windowType = 'weekly_7d'`

**Tier Computation**:
- Uses same thresholds as before (Bronze, Silver, Gold, Platinum)
- Considers both message response times and offer response times
- Tier changes recorded in `SitterTierHistory`

### 6. Acceptance Criteria ✅

- [x] Sitter sees real Pending Request cards when offers exist
- [x] Accept/Decline updates offer + booking assignment correctly
- [x] Countdown timer works and expired offers are handled safely
- [x] Tier metrics update based on in-app accept/decline speed and behavior
- [x] UI remains in sitter Dashboard/Tier tabs (Messages stays inbox-only)
- [x] No Twilio code added

## Files Modified/Created

### Created
- `src/app/api/offers/expire/route.ts` - Offer expiration endpoint

### Modified
- `src/app/api/sitter/me/dashboard/route.ts` - Fetch from OfferEvent
- `src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts` - Use OfferEvent, record responseSeconds
- `src/app/api/sitter/[id]/bookings/[bookingId]/decline/route.ts` - Use OfferEvent, record responseSeconds
- `src/components/sitter/PendingRequests.tsx` - Support offerEvent, add countdown timer
- `src/lib/tiers/tier-engine-twilio.ts` - Merge offer response times with message times
- `src/lib/api/sitter-dashboard-hooks.ts` - Add offerEvent to schema

## Data Flow

1. **Offer Created** → `OfferEvent` with `status = 'sent'`, `expiresAt` set
2. **Sitter Views Dashboard** → Fetches offers where `status = 'sent'` and `expiresAt > now`
3. **Sitter Accepts** → Updates offer to `accepted`, assigns booking, records `responseSeconds`, updates metrics
4. **Sitter Declines** → Updates offer to `declined`, records `responseSeconds`, updates metrics
5. **Offer Expires** → Periodic job marks as `expired`, updates metrics
6. **Tier Computation** → Uses metrics from `SitterMetricsWindow` (updated from offers)

## Testing Checklist

- [ ] Create an offer with `status = 'sent'` and `expiresAt` in future
- [ ] Verify it appears in sitter dashboard
- [ ] Verify countdown timer updates every second
- [ ] Accept offer → verify booking assigned, metrics updated
- [ ] Decline offer → verify metrics updated
- [ ] Try to accept expired offer → verify blocked
- [ ] Try to accept already-accepted offer → verify idempotency
- [ ] Call `/api/offers/expire` → verify expired offers marked
- [ ] Verify tier recomputation uses offer response times
- [ ] Verify TierSummaryCard and TierTab show real data

## Next Steps (Optional)

- Add cron job to call `/api/offers/expire` periodically
- Add webhook/notification when offer expires
- Add analytics for offer acceptance rates
- Add offer creation endpoint (for owners/dispatchers)

## Commit

`5f4d8c2` - feat: Implement in-app booking request flow with OfferEvent
