# Sprint A Step 2: Deployment Checklist - Parity Logging

**Date**: 2024-12-30  
**Status**: Ready for deployment  
**Sprint A Reference**: Step 2 - Enable Parity Logging in Production

---

## Pre-Deployment Verification

### Code Changes
- [x] Parity logging enabled in mapper path when flag is `false`
- [x] Parity logging enabled in non-mapper path when flag is `false`
- [x] TypeScript typecheck passes
- [x] No linter errors
- [x] No behavior changes when flag is `false`

### Code Review
- [x] `compareAndLogPricing()` called in both code paths
- [x] `PricingEngineInput` correctly constructed from form data
- [x] Parity harness only logs, does not modify charges

---

## Deployment Steps

### Step 1: Deploy to Staging

**Render Staging Service**: `snout-os-staging`

1. **Commit and push code changes**:
   ```bash
   git add src/app/api/form/route.ts
   git commit -m "Sprint A Step 1: Enable parity logging when flag is false"
   git push origin main
   ```

2. **Verify staging environment variables**:
   - `USE_PRICING_ENGINE_V1` should be `false` or unset
   - `ENABLE_FORM_MAPPER_V1` can be `true` or `false` (both paths have parity logging)

3. **Monitor Render build**:
   - Check Render dashboard for build status
   - Verify build succeeds
   - Verify staging service starts successfully

4. **Test parity logging in staging**:
   - Submit 1 test booking through staging form
   - Check Render logs for parity harness output
   - Expected log format:
     - `[PricingParity] ✅ Match for booking...` (if totals match)
     - `[PricingParity] ⚠️  Mismatch for booking...` (if totals differ)

5. **Verify staging still works**:
   - Confirm booking was created successfully
   - Verify pricing is unchanged
   - Check booking appears in dashboard

**Checkpoint**: Staging deployment successful, parity logging active

---

### Step 2: Deploy to Production

**Render Production Service**: `snout-os` (or your production service name)

1. **Verify production environment variables**:
   - `USE_PRICING_ENGINE_V1` should be `false` or unset
   - `ENABLE_FORM_MAPPER_V1` is `true` (from Phase 1)

2. **Choose deployment window**:
   - Low-traffic window recommended
   - Late night or weekend preferred

3. **Deploy to production**:
   - Code is already pushed to main
   - Render auto-deploys from main branch
   - Monitor Render dashboard for deployment status

4. **Verify production health**:
   - Check `/api/health` endpoint
   - Verify no errors in Render logs
   - Confirm service is running normally

**Checkpoint**: Production deployment successful, parity logging active

---

## Post-Deployment Monitoring

### Immediate Verification (First Hour)

1. **Submit test booking**:
   - Submit 1 real booking through production form
   - Verify booking is created successfully
   - Check Render logs for parity harness output

2. **Verify logs are working**:
   - Access Render logs dashboard
   - Filter for `[PricingParity]`
   - Confirm parity comparison logs appear

3. **Verify no pricing changes**:
   - Check booking total in dashboard
   - Compare with expected pricing (manual calculation)
   - Confirm pricing matches old path

**Checkpoint**: Parity logging verified in production

---

### Week 1 Monitoring (Required)

**Duration**: 7 days from deployment

**Daily Tasks**:
1. Check Render logs for parity harness output
2. Review booking submissions
3. Verify no pricing errors
4. Document any mismatches found

**Log Monitoring**:
- Access Render logs dashboard
- Filter for `[PricingParity]`
- Look for:
  - ✅ Match messages (expected - most bookings)
  - ⚠️ Mismatch messages (investigate if found)

**Expected Log Output Examples**:

**Match (Good)**:
```
[PricingParity] ✅ Match for booking abc123: $125.00
```

**Mismatch (Needs Investigation)**:
```
[PricingParity] ⚠️  Mismatch for booking xyz789: {
  oldTotal: 125.00,
  newTotal: 125.50,
  difference: 0.50,
  differencePercent: 0.40,
  warnings: [
    "Pricing mismatch: old=125.00, new=125.50, diff=$0.50 (0.40%)"
  ]
}
```

**Data Collection**:
- Count total bookings submitted
- Count match vs mismatch occurrences
- Document any patterns (specific services, date ranges, etc.)

**Checkpoint**: 1 week of monitoring complete, parity data collected

---

## Parity Analysis (After 1 Week)

### Review Collected Data

1. **Total Bookings**: Count bookings submitted during monitoring period
2. **Match Rate**: Percentage of bookings with matching totals
3. **Mismatch Details**: List any bookings with pricing differences

### Success Criteria

**✅ Zero Drift (Ideal)**:
- All bookings show `✅ Match`
- No pricing discrepancies found
- Ready to proceed to Step 4 (enable in staging)

**⚠️ Acceptable Drift**:
- Mismatches are < $0.01 (rounding differences)
- Less than 1% of bookings have mismatches
- Mismatches are explainable (rounding, edge cases)
- Ready to proceed to Step 4 with caution

**❌ Significant Drift**:
- Mismatches are > $0.01
- More than 1% of bookings have mismatches
- Mismatches are unexplained
- **STOP**: Must investigate and fix before proceeding

### If Significant Drift Found

1. **Investigate Root Cause**:
   - Review pricing engine code
   - Compare old vs new calculation logic
   - Identify discrepancy sources

2. **Fix Issues in Staging**:
   - Update pricing engine
   - Test fixes in staging
   - Verify parity improves

3. **Retry Parity Logging**:
   - Deploy fixes to production
   - Monitor for another week
   - Re-analyze parity data

---

## Rollback Procedure

**If ANY issues detected during monitoring:**

1. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Or manually remove parity logging**:
   - Edit `src/app/api/form/route.ts`
   - Remove `compareAndLogPricing()` calls from `else` blocks
   - Commit and push

3. **Render auto-redeploys**:
   - Production reverts to previous state
   - Parity logging stops
   - System continues with old pricing path only

**Rollback Time**: < 5 minutes

**Note**: Rollback is unlikely needed - parity logging doesn't change behavior, only logs. But if logs show issues, we can revert.

---

## Next Steps After Successful Monitoring

**If parity analysis shows zero drift or acceptable drift:**

1. **Proceed to Sprint A Step 4**: Enable in staging (internal admin view only)
2. **Reference**: `SPRINT_A_PRICING_UNIFICATION_ROLLOUT.md` Step 4

**If parity analysis shows significant drift:**

1. **Investigate and fix issues**
2. **Re-run parity logging for another week**
3. **Re-analyze parity data**
4. **Only proceed when drift is resolved**

---

## Verification Checklist

### Deployment
- [ ] Code committed and pushed to main
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Health endpoints responding

### Monitoring Setup
- [ ] Render logs dashboard accessible
- [ ] Log filtering configured for `[PricingParity]`
- [ ] Test booking submitted and verified
- [ ] Parity logs appearing in logs

### Week 1 Monitoring
- [ ] Daily log review scheduled
- [ ] Booking submissions monitored
- [ ] No pricing errors detected
- [ ] Parity data being collected

### Analysis
- [ ] Total bookings counted
- [ ] Match rate calculated
- [ ] Mismatches documented (if any)
- [ ] Root causes investigated (if mismatches found)
- [ ] Decision made: Proceed / Fix / Stop

---

**Last Updated**: 2024-12-30  
**Status**: Ready for deployment  
**Next Action**: Deploy to staging and production, begin 1-week monitoring period

