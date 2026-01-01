# Sprint A: Pricing Unification Rollout Plan

**Date**: 2024-12-30  
**Status**: Phase 1 VERIFIED in production, proceeding to Sprint A  
**Master Spec Reference**: Phase 2 - Pricing Unification  
**Feature Flag**: `USE_PRICING_ENGINE_V1`

---

## Objective

Replace all pricing calculation paths with a single canonical `PricingEngine v1` that produces truthful pricing breakdowns. All surfaces must display the same pricing totals.

**Non-Negotiable**: Zero pricing changes to client charges during rollout. Parity must be proven before enabling.

---

## Prerequisites

**REQUIRED before starting:**
- ✅ Phase 1 verified in production (`ENABLE_FORM_MAPPER_V1=true`)
- ✅ PricingEngine v1 code exists (`src/lib/pricing-engine-v1.ts`)
- ✅ PricingParity harness exists (`src/lib/pricing-parity-harness.ts`)
- ✅ Pricing snapshot helpers exist (`src/lib/pricing-snapshot-helpers.ts`)
- ✅ Feature flag exists: `USE_PRICING_ENGINE_V1` (defaults to `false` per `src/lib/env.ts:37`)
- ✅ Integration point exists in form route (`src/app/api/form/route.ts:131`)

---

## Current State Analysis

### Code Evidence: ✅ EXISTS

**Pricing Engine**:
- `src/lib/pricing-engine-v1.ts` - Canonical pricing engine
- `src/lib/pricing-parity-harness.ts` - Parity comparison harness
- `src/lib/pricing-snapshot-helpers.ts` - Snapshot serialization

**Integration**:
- Form route: `src/app/api/form/route.ts:131` - Checks `USE_PRICING_ENGINE_V1` flag
- When `true`: Uses canonical engine, stores pricingSnapshot
- When `false`: Uses existing pricing logic

**Feature Flag**:
- `USE_PRICING_ENGINE_V1` exists in `src/lib/env.ts:37`
- Defaults to `false` (safe default)

### Missing Verification

**NOT VERIFIED**:
- Parity tests between old and new pricing paths
- Zero drift validation
- Production pricing comparison
- Dashboard display verification

---

## Rollout Strategy

**Master Spec Phase 2 Requirements**:
1. Implement PricingEngine v1 (✅ Done)
2. Add PricingParity harness (✅ Done)
3. Add feature flag `USE_PRICING_ENGINE_V1` default false (✅ Done)
4. Switch one surface at a time to display pricingSnapshot when flag true (start with internal admin view)
5. When parity reaches acceptable zero drift for a week, flip flag for all surfaces

**Approach**: Surface-by-surface rollout with parity verification

---

## Step 1: Enable Parity Logging in Staging (No Behavior Change)

**Purpose**: Run both pricing paths and log differences without changing charges

**Action**:
1. In staging Render service, set `USE_PRICING_ENGINE_V1=false` (keep off)
2. Verify staging is running normally
3. Monitor staging logs for parity harness output (if triggered)

**Expected Behavior**:
- Bookings continue using old pricing path
- Parity harness may log comparisons if called (check logs)
- No pricing changes

**Checkpoint**: Staging continues working with old pricing path

**Rollback**: Not needed - flag stays false, no behavior change

---

## Step 2: Enable Parity Logging in Production (No Behavior Change)

**Purpose**: Enable parity harness logging in production to compare old vs new

**Action**:
1. In production Render service, verify `USE_PRICING_ENGINE_V1=false` (should be unset or false)
2. Submit 10 real bookings through production (normal operations)
3. Monitor production logs for any parity harness output

**Expected Behavior**:
- Bookings use old pricing path (unchanged)
- Parity harness may log comparisons if called
- No pricing changes to clients

**Duration**: 1 week of normal operation

**Checkpoint**: Parity logging active, collecting comparison data

**Rollback**: Not needed - flag stays false, no behavior change

---

## Step 3: Analyze Parity Data (After 1 Week)

**Action**: Review logs for pricing differences

1. Check EventLog for pricing parity entries
2. Check application logs for parity harness output
3. Identify any bookings with pricing differences
4. Document drift patterns (if any)

**Checkpoint**: Parity analysis complete

**Success Criteria**:
- ✅ Zero drift for all bookings (ideal)
- ⚠️ Acceptable drift (< $0.01 rounding differences)
- ❌ Significant drift (> $0.01) = must investigate before proceeding

**If Significant Drift Found**:
- **STOP** rollout
- Investigate pricing engine discrepancies
- Fix issues in staging
- Retry parity logging

**Rollback**: Not needed - flag stays false, no changes made

---

## Step 4: Enable in Staging - Internal Admin View Only

**Purpose**: Test pricing engine on one surface in staging

**Action**:
1. In staging Render service, set `USE_PRICING_ENGINE_V1=true`
2. Deploy staging
3. Submit 5 test bookings in staging
4. Verify pricing displays correctly in internal admin dashboard view
5. Compare pricing totals with old path (from parity logs or manual calculation)

**Checkpoint**: Pricing engine working in staging admin view

**Verification**:
- ✅ Admin dashboard shows pricing correctly
- ✅ Pricing matches expected totals
- ✅ No errors in logs

**Rollback**: Set `USE_PRICING_ENGINE_V1=false` in staging, redeploy

---

## Step 5: Monitor Staging for 1 Week

**Action**: Extended monitoring period

1. Monitor staging logs for pricing errors
2. Submit additional test bookings
3. Verify pricing consistency
4. Check for any drift or discrepancies

**Checkpoint**: 1 week of stable staging operation

**Success Criteria**:
- ✅ Zero pricing errors
- ✅ Consistent pricing display
- ✅ No drift detected

**Rollback**: Set `USE_PRICING_ENGINE_V1=false` in staging, redeploy

---

## Step 6: Enable in Production - Internal Admin View Only (Low Traffic)

**Action**: Enable in production during low-traffic window

1. Choose low-traffic window (late night/weekend)
2. In production Render service, set `USE_PRICING_ENGINE_V1=true`
3. Deploy production
4. Verify health endpoint: `/api/health`
5. Monitor production logs for errors

**Checkpoint**: Pricing engine enabled in production

**Expected Behavior**:
- Form route uses new pricing engine
- PricingSnapshot stored on bookings
- Admin dashboard displays pricing from snapshot

**Rollback**: Set `USE_PRICING_ENGINE_V1=false`, save, redeploy (< 2 minutes)

---

## Step 7: Production Verification (1 Week)

**Action**: Monitor production pricing for 1 week

1. Submit real bookings through production
2. Verify pricing in admin dashboard
3. Compare with manual calculations or old pricing logic
4. Monitor logs for pricing errors
5. Check EventLog for pricing drift events

**Checkpoint**: 1 week of production operation with pricing engine

**Success Criteria**:
- ✅ All bookings have correct pricing
- ✅ Admin dashboard displays pricing correctly
- ✅ No pricing drift events
- ✅ No pricing errors in logs

**Rollback**: Set `USE_PRICING_ENGINE_V1=false`, save, redeploy (< 2 minutes)

---

## Step 8: Enable for All Surfaces (After Parity Proven)

**Action**: Enable pricing engine for all surfaces

**Prerequisites**:
- ✅ Zero drift confirmed for 1+ week
- ✅ Admin view verified
- ✅ Production stable

**Action**:
1. Verify all surfaces read from pricingSnapshot
2. Confirm no surfaces still use old pricing paths
3. Flag already enables engine for form route (primary entry point)
4. Verify other surfaces (if any) use snapshot display

**Checkpoint**: All surfaces using canonical pricing engine

**Verification**:
- Form route: Uses engine when flag true ✅
- Admin dashboard: Displays from snapshot ✅
- Other views: Verify snapshot usage

**Rollback**: Set `USE_PRICING_ENGINE_V1=false`, save, redeploy

---

## Rollback Procedure

**If ANY pricing issue is detected:**

1. In Render Dashboard, open production service
2. Go to **Environment** tab
3. Set `USE_PRICING_ENGINE_V1=false` (or delete variable)
4. Click **Save Changes**
5. Render auto-redeploys
6. Production immediately reverts to old pricing path
7. System is safe

**Total rollback time**: < 2 minutes

---

## Success Criteria

Sprint A (Pricing Unification) is **SUCCESSFUL** when:
- ✅ Zero pricing drift for 1+ week in production
- ✅ All bookings store pricingSnapshot
- ✅ All surfaces display same pricing totals
- ✅ No pricing errors in logs
- ✅ Feature flag can remain `true` permanently

---

## Verification Checklist

### Parity Verification
- [ ] Parity logging enabled in staging
- [ ] Parity logging enabled in production (1 week)
- [ ] Parity analysis shows zero drift (or acceptable rounding)
- [ ] No significant pricing discrepancies found

### Staging Verification
- [ ] Pricing engine enabled in staging
- [ ] Admin dashboard shows correct pricing
- [ ] 5+ test bookings verified
- [ ] 1 week of stable staging operation

### Production Verification
- [ ] Pricing engine enabled in production
- [ ] Admin dashboard shows correct pricing
- [ ] Real bookings verified
- [ ] 1 week of stable production operation
- [ ] Zero pricing drift events

### Final Verification
- [ ] All surfaces use pricingSnapshot
- [ ] Flag can remain `true`
- [ ] Pricing unification complete

---

## Forbidden Actions

**DO NOT:**
- Enable flag without parity verification
- Skip monitoring periods
- Enable for all surfaces before admin view is proven
- Ignore pricing drift events
- Make pricing logic changes during rollout

**ONLY DO:**
- Enable flag incrementally
- Verify parity at each step
- Monitor for extended periods
- Rollback if any issues

---

## Post-Rollout Documentation

After successful rollout, document:

1. **Rollout Start Date**: ___________
2. **Rollout Complete Date**: ___________
3. **Parity Analysis Results**: Zero drift / Acceptable drift / Issues found
4. **Production Bookings Verified**: Count and IDs
5. **Drift Events**: None / [List if any]
6. **Rollback Required**: Yes / No
7. **Final Status**: ✅ SUCCESS / ❌ ROLLED BACK

---

## Next Steps (After Successful Rollout)

Once Pricing Unification is proven:

1. **Gate B**: Security Containment activation (Phase 4)
2. Continue with remaining phases per Master Spec

---

**Last Updated**: 2024-12-30  
**Status**: Ready for execution after parity analysis

