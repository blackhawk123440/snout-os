# Phase 1 Production Rollout Plan

**Date**: 2024-12-30  
**Status**: ✅ Phase 1 VERIFIED in staging (proof artifacts complete)  
**Purpose**: Safe, minimal production rollout with instant rollback capability

---

## Prerequisites

**REQUIRED before starting:**
- ✅ Phase 1 verified in staging (confirmed via `PHASE_1_ACCEPTANCE_CHECKLIST.md`)
- ✅ Staging bookings verified: IDs C734D3E7, 6B63F044, C5D32195, CA8F460C, 3FB3F389
- ✅ Production baseline confirmed: `ENABLE_FORM_MAPPER_V1=false` (default)
- ✅ Production service running normally
- ✅ Rollback plan understood

---

## Rollout Steps

### Step 1: Pre-Rollout Verification (5 minutes)

**Action**: Verify production baseline

1. In Render Dashboard, open your **production** web service
2. Go to **Environment** tab
3. Confirm `ENABLE_FORM_MAPPER_V1` is either:
   - Not present (defaults to false), OR
   - Explicitly set to `false`
4. Document current state: `ENABLE_FORM_MAPPER_V1=[NOT SET or false]` at [timestamp]

**Checkpoint**: Production baseline confirmed and documented

**Rollback**: Not needed - just documenting current state

---

### Step 2: Choose Low-Traffic Window (Critical)

**Action**: Select deployment window

- **Best times**: Late night (11 PM - 2 AM local time) or weekend morning
- **Avoid**: Business hours, peak booking times
- **Duration needed**: ~30 minutes for testing

**Checkpoint**: Low-traffic window selected: [DATE/TIME]

**Rollback**: Not needed - planning only

---

### Step 3: Enable Flag in Production (1 minute)

**Action**: Set feature flag to true

1. In Render Dashboard, open **production** web service
2. Go to **Environment** tab
3. Find `ENABLE_FORM_MAPPER_V1` environment variable
4. If not present: Click "Add Environment Variable"
5. Set:
   - **Key**: `ENABLE_FORM_MAPPER_V1`
   - **Value**: `true`
6. Click **Save Changes**

**Checkpoint**: Flag set to `true` in production environment variables

**Rollback**: If you need to stop here:
1. Delete `ENABLE_FORM_MAPPER_V1` or set to `false`
2. Click **Save Changes**
3. Render will auto-redeploy

---

### Step 4: Deploy Production (2-5 minutes)

**Action**: Trigger deployment

1. Render should auto-deploy after saving environment variable
2. Watch deployment logs
3. Verify deployment completes successfully (status: "Live")

**Checkpoint**: Production deployment successful

**Verification**:
- Deployment status: "Live"
- No build errors in logs
- No runtime errors in logs

**Rollback**: If deployment fails:
1. Set `ENABLE_FORM_MAPPER_V1=false`
2. Save and redeploy
3. Investigate failure before retrying

---

### Step 5: Production Health Check (2 minutes)

**Action**: Verify production is healthy

1. Open production health endpoint: `https://backend-291r.onrender.com/api/health`
2. Verify response shows:
   - `status: "ok"`
   - `services.database: "ok"`
3. If health check fails, proceed to Rollback

**Checkpoint**: Production health check passed

**Rollback**: If health check fails:
1. Set `ENABLE_FORM_MAPPER_V1=false`
2. Save and redeploy
3. Production returns to baseline

---

### Step 6: Test Booking 1 - Production (5 minutes)

**Action**: Submit one real booking through production form

1. Open production booking form
2. Submit a **real** booking with:
   - Real client information (use a test client if possible)
   - Standard booking details
   - Complete all required fields
3. Note the booking ID from response or dashboard
4. Immediately verify in production dashboard:
   - Booking appears correctly
   - All fields mapped correctly
   - Notes field correct
   - Pet information correct
   - Dates/times correct

**Checkpoint**: Booking 1 verified in production

**Success Criteria**:
- ✅ Booking submitted successfully (HTTP 200/201)
- ✅ Booking appears in dashboard
- ✅ All fields match form input
- ✅ No errors in booking record

**Rollback**: If Booking 1 fails ANY check:
1. **IMMEDIATE ROLLBACK**: Set `ENABLE_FORM_MAPPER_V1=false`
2. Save and redeploy
3. Document failure:
   - Booking ID (if available)
   - What failed
   - Expected vs actual values
4. **STOP** - Do not proceed until issue is fixed in staging

**Checkpoint Log**:
- Booking ID: ___________
- Status: ✅ PASS / ❌ FAIL
- Issues: ___________

---

### Step 7: Monitor for 15 Minutes (15 minutes)

**Action**: Observe production behavior

1. Watch production logs for errors
2. Monitor booking submissions (if any)
3. Check dashboard for any anomalies
4. Verify no unexpected errors

**Checkpoint**: 15-minute monitoring period passed with no issues

**Rollback**: If any unexpected errors occur:
1. Set `ENABLE_FORM_MAPPER_V1=false`
2. Save and redeploy
3. Investigate errors

---

### Step 8: Test Bookings 2-4 - Production (15 minutes)

**Action**: Submit 3 more real bookings

**Only proceed if Booking 1 passed all checks.**

For each booking (2, 3, 4):

1. Submit real booking through production form
2. Note booking ID
3. Verify in dashboard:
   - All fields correct
   - Notes precedence correct (if applicable)
   - Multi-pet handling (if applicable)
   - Time slot handling (if applicable)

**Checkpoint**: Bookings 2-4 verified

**Success Criteria**: All bookings pass same checks as Booking 1

**Rollback**: If ANY booking fails:
1. **IMMEDIATE ROLLBACK**: Set `ENABLE_FORM_MAPPER_V1=false`
2. Save and redeploy
3. Document failure details
4. **STOP** - Investigate before retrying

**Checkpoint Log**:
- Booking 2 ID: ___________ Status: ✅ / ❌
- Booking 3 ID: ___________ Status: ✅ / ❌
- Booking 4 ID: ___________ Status: ✅ / ❌

---

## Rollback Procedure (One-Minute Rollback)

**If ANY issue is detected at ANY step:**

1. In Render Dashboard, open production service
2. Go to **Environment** tab
3. Set `ENABLE_FORM_MAPPER_V1` to `false` (or delete the variable)
4. Click **Save Changes**
5. Render auto-redeploys
6. Production immediately reverts to old behavior
7. System is safe

**Total rollback time**: < 2 minutes

---

## Success Criteria

Phase 1 production rollout is **SUCCESSFUL** when:
- ✅ All 4 production bookings pass verification
- ✅ No errors in production logs
- ✅ Dashboard shows all bookings correctly
- ✅ 15-minute monitoring period passed with no issues

---

## Post-Rollout Documentation

After successful rollout, document:

1. **Rollout Date/Time**: ___________
2. **Production Bookings Verified**:
   - Booking 1 ID: ___________
   - Booking 2 ID: ___________
   - Booking 3 ID: ___________
   - Booking 4 ID: ___________
3. **Issues Encountered**: None / [List if any]
4. **Rollback Required**: Yes / No
5. **Rollout Status**: ✅ SUCCESS / ❌ ROLLED BACK

---

## Forbidden Actions

**DO NOT:**
- Enable any other feature flags during this rollout
- Make any code changes during rollout
- Skip verification steps
- Proceed if any booking fails checks
- Leave flag enabled if unsure about results

**ONLY DO:**
- Enable `ENABLE_FORM_MAPPER_V1=true` in production
- Test with real bookings
- Verify results
- Rollback if needed

---

## Next Steps (After Successful Rollout)

Once Phase 1 is proven in production:

1. **Sprint A**: Pricing Unification rollout
2. **Gate B**: Security Containment activation
3. Continue with remaining phases per Master Spec

---

**Last Updated**: 2024-12-30  
**Status**: Ready for execution

