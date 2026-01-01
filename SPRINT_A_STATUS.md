# Sprint A: Pricing Unification - Status

**Last Updated**: 2024-12-30  
**Master Spec Reference**: Phase 2 - Pricing Unification  
**Feature Flag**: `USE_PRICING_ENGINE_V1` (defaults to `false`)

---

## Current Status: ✅ STEP 1 COMPLETE

**Step 1**: Enable Parity Logging (No Behavior Change) - ✅ **COMPLETE**

### Completed
- ✅ Parity logging enabled in form route when flag is `false`
- ✅ Code changes implemented in both mapper and non-mapper paths
- ✅ TypeScript typecheck passes
- ✅ No linter errors
- ✅ Deployment checklist created

### Ready for
- ⏳ **Step 2**: Deploy to staging and production
- ⏳ **Step 3**: Monitor parity logs for 1 week
- ⏳ **Step 4**: Analyze parity data

---

## Step-by-Step Progress

### ✅ Step 1: Enable Parity Logging (No Behavior Change)
**Status**: Complete  
**Date Completed**: 2024-12-30  
**Files Changed**:
- `src/app/api/form/route.ts` (lines ~155-168, ~534-551)

**Summary**: Parity logging now runs even when `USE_PRICING_ENGINE_V1=false`, allowing collection of comparison data without changing client charges.

**Documentation**:
- `SPRINT_A_STEP_1_COMPLETE.md` - Code changes summary
- `SPRINT_A_STEP_2_DEPLOYMENT_CHECKLIST.md` - Deployment guide

---

### ⏳ Step 2: Deploy Parity Logging to Production
**Status**: Pending deployment  
**Required Actions**:
1. Deploy code changes to staging
2. Verify parity logging works in staging
3. Deploy code changes to production
4. Verify parity logging works in production

**Expected Behavior**:
- Bookings continue using old pricing path
- Parity harness logs comparisons to console
- No pricing changes to clients

**Monitoring**: Check Render logs for `[PricingParity]` messages

---

### ⏳ Step 3: Monitor Parity Logs (1 Week)
**Status**: Not started  
**Duration**: 7 days after Step 2 deployment

**Tasks**:
- Daily log review
- Document match vs mismatch occurrences
- Collect parity comparison data

**Success Criteria**:
- Zero drift (ideal)
- Acceptable drift < $0.01 (acceptable)
- Significant drift > $0.01 (must fix)

---

### ⏳ Step 4: Analyze Parity Data
**Status**: Not started  
**Prerequisite**: Step 3 complete (1 week of data)

**Actions**:
- Review collected parity data
- Calculate match rate
- Document any mismatches
- Decide: Proceed / Fix / Stop

---

### ⏳ Step 5: Enable in Staging (Internal Admin View Only)
**Status**: Not started  
**Prerequisite**: Step 4 shows zero or acceptable drift

**Action**: Set `USE_PRICING_ENGINE_V1=true` in staging

---

### ⏳ Step 6: Monitor Staging (1 Week)
**Status**: Not started  
**Prerequisite**: Step 5 complete

---

### ⏳ Step 7: Enable in Production (Internal Admin View Only)
**Status**: Not started  
**Prerequisites**: Steps 5-6 complete, 1 week stable staging

---

### ⏳ Step 8: Monitor Production (1 Week)
**Status**: Not started  
**Prerequisite**: Step 7 complete

---

### ⏳ Step 9: Enable for All Surfaces
**Status**: Not started  
**Prerequisites**: Steps 7-8 complete, zero drift proven

---

## Quick Reference

### Feature Flag
- **Name**: `USE_PRICING_ENGINE_V1`
- **Default**: `false` (safe default)
- **Location**: `src/lib/env.ts:37`

### Log Format
**Match**:
```
[PricingParity] ✅ Match for booking abc123: $125.00
```

**Mismatch**:
```
[PricingParity] ⚠️  Mismatch for booking xyz789: {
  oldTotal: 125.00,
  newTotal: 125.50,
  difference: 0.50,
  differencePercent: 0.40,
  warnings: [...]
}
```

### Key Files
- `src/app/api/form/route.ts` - Form submission handler
- `src/lib/pricing-engine-v1.ts` - Canonical pricing engine
- `src/lib/pricing-parity-harness.ts` - Parity comparison harness
- `SPRINT_A_PRICING_UNIFICATION_ROLLOUT.md` - Full rollout plan

---

## Next Action

**Deploy Step 1 changes and begin Step 2 monitoring**

See `SPRINT_A_STEP_2_DEPLOYMENT_CHECKLIST.md` for detailed deployment instructions.

