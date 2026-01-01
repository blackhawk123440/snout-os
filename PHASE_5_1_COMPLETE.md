# Phase 5.1: Sitter Access Control and Scoping - COMPLETE

**Master Spec Reference**: Lines 137-141 (7.1 Sitter roles and access)
"Phase 5, sitter tiers and dashboards" - Step 1

**Date**: 2024-12-30

---

## Objective

Implement proper sitter authentication and data scoping per Master Spec 7.1:
- 7.1.1: Sitters can see only their assigned bookings and limited client data
- 7.1.2: Sitters cannot see payments, pricing settings, global automation settings, or other sitters data
- 7.1.3: Sitter messaging is allowed only in contexts tied to assignments

---

## Implementation

### 1. Sitter Authentication Helpers ✅

**File**: `src/lib/sitter-helpers.ts` (NEW)

**Functions Created**:
- `getCurrentSitterId()` - Get sitter ID from session
- `getCurrentSitter()` - Get full sitter record from session
- `requireSitter()` - Require sitter authentication (throws if not authenticated)
- `verifySitterBookingAccess()` - Verify sitter has access to a booking
- `limitClientDataForSitter()` - Limit client data per spec 7.1.1

**Key Features**:
- Uses existing NextAuth session system
- Leverages `User.sitterId` relationship
- Safe error handling (returns null on failure)
- Type-safe with TypeScript

---

### 2. Limited Client Data ✅

**File**: `src/app/api/sitter/[id]/bookings/route.ts` (UPDATED)

**Changes**:
- Added sitter authentication check when `ENABLE_SITTER_AUTH=true`
- Verifies authenticated sitter matches requested sitter ID
- Uses `limitClientDataForSitter()` to filter booking data
- Returns only necessary fields:
  - ✅ firstName, lastName (identification)
  - ✅ phone (contact)
  - ✅ address, pickupAddress, dropoffAddress (job location)
  - ✅ pets (job requirements)
  - ✅ service, startAt, endAt, status, notes (booking details)
  - ✅ timeSlots (schedule)
  - ❌ Excludes: email, totalPrice, paymentStatus, stripePaymentLinkUrl, tipLinkUrl, pricingSnapshot

**Compliance**: ✅ Master Spec 7.1.1

---

### 3. Access Restrictions ✅

**File**: `src/lib/sitter-routes.ts` (NEW)

**Functions Created**:
- `isSitterRoute()` - Identifies sitter-accessible routes
- `isSitterRestrictedRoute()` - Identifies routes sitters cannot access

**Restricted Routes** (per spec 7.1.2):
- ❌ `/api/payments/*` - Payment admin routes
- ❌ `/api/settings/*` - Global settings
- ❌ `/api/automations/*` - Automation settings (except ledger read-only)
- ❌ `/api/pricing-rules/*` - Pricing settings
- ❌ `/api/service-configs/*` - Service configuration
- ❌ `/api/sitters` - Other sitters' data (list endpoint)
- ❌ `/settings/*` - Settings pages
- ❌ `/payments/*` - Payment pages
- ❌ `/bookings/*` - Admin booking pages (not sitter dashboard)

**File**: `src/middleware.ts` (UPDATED)

**Changes**:
- Added sitter auth check before other auth checks
- Enforces sitter restrictions when `ENABLE_SITTER_AUTH=true`
- Returns 403 for restricted routes
- Allows sitter routes to proceed (with API-level verification)

**Compliance**: ✅ Master Spec 7.1.2

---

### 4. Messaging Scoping ✅

**File**: `src/app/api/reports/route.ts` (UPDATED)

**Changes**:
- Added sitter authentication check when `ENABLE_SITTER_AUTH=true`
- Verifies authenticated sitter matches sitterId in request
- Uses `verifySitterBookingAccess()` for additional verification
- Existing check: `booking.sitterId !== trimmedSitterId` (already enforced)
- Returns 403 if sitter tries to submit report for non-assigned booking

**Compliance**: ✅ Master Spec 7.1.3

---

## Feature Flag

**`ENABLE_SITTER_AUTH`** (default: `false`)
- When `false`: Current behavior (URL params, no restrictions)
- When `true`: Sitter authentication required, restrictions enforced

**Safety**: Flag defaults to `false`, ensuring zero risk on deployment

---

## Backward Compatibility

**When `ENABLE_SITTER_AUTH=false`**:
- ✅ All existing functionality works unchanged
- ✅ URL param `?id=` still works
- ✅ No authentication required
- ✅ No restrictions enforced

**When `ENABLE_SITTER_AUTH=true`**:
- ✅ Sitters must authenticate via NextAuth
- ✅ Sitters can only access their own bookings
- ✅ Client data is limited
- ✅ Restricted routes return 403
- ✅ Messaging scoped to assigned bookings

---

## Master Spec Compliance

✅ **7.1.1**: Sitters can see only their assigned bookings and limited client data
- ✅ Booking API scoped to `sitterId`
- ✅ Client data limited via `limitClientDataForSitter()`
- ✅ Authentication verifies sitter access

✅ **7.1.2**: Sitters cannot see payments, pricing settings, global automation settings, or other sitters data
- ✅ Restricted routes defined in `sitter-routes.ts`
- ✅ Middleware enforces restrictions
- ✅ Returns 403 for unauthorized access

✅ **7.1.3**: Sitter messaging is allowed only in contexts tied to assignments
- ✅ Reports API verifies booking assignment
- ✅ Additional verification with `verifySitterBookingAccess()`
- ✅ Returns 403 if booking not assigned to sitter

---

## Files Created

- `src/lib/sitter-helpers.ts` - Sitter authentication and data scoping helpers
- `src/lib/sitter-routes.ts` - Sitter route definitions and restrictions

## Files Modified

- `src/app/api/sitter/[id]/bookings/route.ts` - Limited client data, added auth check
- `src/app/api/reports/route.ts` - Added sitter auth and booking access verification
- `src/middleware.ts` - Added sitter restriction enforcement

---

## Verification

✅ **TypeScript**: All types correct, no errors
✅ **Build**: Builds successfully
✅ **Backward Compatible**: Works with flag `false`
✅ **Feature Flag Gated**: All changes behind `ENABLE_SITTER_AUTH`

---

## Next Steps

**Phase 5.2**: Complete tier system with rules and performance gates
**Phase 5.3**: Complete dashboard features (schedule, details, earnings, training, tasks)

---

**Phase 5.1 Status**: ✅ **COMPLETE**

