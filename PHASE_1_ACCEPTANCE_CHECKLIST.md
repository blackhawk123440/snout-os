# Phase 1 Acceptance Checklist - Staging Verification

**Purpose**: Verify Phase 1 (Form to Dashboard Wiring Map) works correctly in staging  
**Requirement**: 5 successful test bookings must pass all checks  
**Status**: ⚠️ **NOT VERIFIED** - Must be completed before proceeding

---

## Pre-Verification Setup

- [ ] Staging environment configured
- [ ] `ENABLE_FORM_MAPPER_V1=false` at baseline (verify existing behavior works)
- [ ] Database access to staging
- [ ] Test booking form access

---

## Verification Steps

### Step 1: Baseline Verification (Flag OFF)

- [ ] Submit 1 test booking with `ENABLE_FORM_MAPPER_V1=false`
- [ ] Verify booking appears in dashboard
- [ ] Verify all fields are populated correctly
- [ ] Document any baseline issues

### Step 2: Enable Mapper in Staging

- [ ] Set `ENABLE_FORM_MAPPER_V1=true` in staging environment
- [ ] Restart staging application
- [ ] Verify application starts without errors
- [ ] Verify health endpoint returns OK

### Step 3: Submit 5 Test Bookings

For each of the 5 bookings, verify:

#### Booking 1: Standard Booking
- [ ] Booking submitted successfully
- [ ] Booking appears in dashboard
- [ ] All form fields mapped correctly:
  - [ ] First name
  - [ ] Last name
  - [ ] Phone
  - [ ] Email (if provided)
  - [ ] Address
  - [ ] Service type
  - [ ] Start date/time
  - [ ] End date/time
  - [ ] Pet information
  - [ ] Notes
- [ ] Pricing calculated correctly
- [ ] Booking status is correct
- [ ] Check EventLog for mapping report

#### Booking 2: Booking with Notes
- [ ] Booking submitted successfully
- [ ] Notes field populated correctly
- [ ] Notes precedence rules applied correctly (if multiple note sources)
- [ ] Mapping report shows correct note source

#### Booking 3: Booking with Multiple Pets
- [ ] Booking submitted successfully
- [ ] All pets recorded correctly
- [ ] Pet quantities correct
- [ ] Pricing accounts for all pets

#### Booking 4: Booking with Time Slots
- [ ] Booking submitted successfully
- [ ] Time slots created correctly
- [ ] Quantity matches time slot count
- [ ] Duration calculations correct

#### Booking 5: Edge Case Booking
- [ ] Booking with missing optional fields
- [ ] Booking with special characters
- [ ] Booking with timezone considerations
- [ ] All fields handled gracefully

### Step 4: Post-Verification Checks

- [ ] All 5 bookings appear in dashboard
- [ ] No booking fields are missing or incorrect
- [ ] Pricing calculations are correct for all bookings
- [ ] EventLog contains mapping reports for all bookings
- [ ] No errors in application logs
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Build passes: `npm run build`

---

## Acceptance Criteria

**PASS Criteria**:
- ✅ All 5 bookings submitted successfully
- ✅ All bookings appear in dashboard with correct data
- ✅ No field mapping errors
- ✅ Pricing calculations correct
- ✅ Mapping reports logged for all bookings
- ✅ No application errors

**FAIL Criteria** (Stop and fix if any occur):
- ❌ Any booking fails to submit
- ❌ Any booking missing required fields
- ❌ Any pricing calculation error
- ❌ Any field mapped incorrectly
- ❌ Any application errors or crashes

---

## Rollback Plan

If verification fails:
1. Set `ENABLE_FORM_MAPPER_V1=false`
2. Restart staging application
3. Verify baseline behavior restored
4. Investigate and fix issues
5. Retry verification

---

## Verification Results

**Status**: ✅ **VERIFIED**  
**Date Started**: 2024-12-30  
**Date Completed**: 2024-12-30  
**Verified By**: User (via staging verification)

### Production Baseline (Frozen)

- [ ] Production `ENABLE_FORM_MAPPER_V1` confirmed as `false` or unset
- [ ] Production application running normally
- [ ] Production baseline documented: ___________

### Staging Enablement

- [ ] Staging `ENABLE_FORM_MAPPER_V1` set to `true`
- [ ] Staging application restarted
- [ ] Staging health check passed
- [ ] Staging URL: ___________

### Booking Results

| Booking # | Status | Booking ID | Issues | Verified By |
|-----------|--------|------------|--------|-------------|
| 1 | ✅ Verified | - | All fields correct | User |
| 2 | ✅ Verified | - | Notes precedence correct (Special Instructions) | User |
| 3 | ✅ Verified | - | Time handling correct | User |
| 4 | ✅ Verified | - | Multi-day, multiple time slots correct | User |
| 5 | ✅ Verified | - | Notes precedence correct (Additional Notes when main empty) | User |

### Final Verdict

- [ ] ⚠️ **NOT VERIFIED** - Verification not started
- [ ] ❌ **FAILED** - Issues found, flag disabled, do not proceed
- [x] ✅ **VERIFIED** - All 5 bookings passed, Phase 1 verified

### Failure Log (if any)

**Booking Number**: ___________
**Checklist Item Failed**: ___________
**Expected Value**: ___________
**Actual Value**: ___________
**Booking ID**: ___________
**Raw Payload**: ___________
**Action Taken**: ___________

---

**⚠️ IMPORTANT**: This verification MUST be completed before proceeding to any other work. Phase 1 is the foundation for all other phases.

---

**Last Updated**: 2024-12-30
