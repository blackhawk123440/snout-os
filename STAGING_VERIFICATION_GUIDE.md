# Staging Verification Guide for ENABLE_FORM_MAPPER_V1

**Date**: 2024-12-30  
**Feature**: Phase 1 Form to Booking Mapper  
**Flag**: `ENABLE_FORM_MAPPER_V1`  
**Baseline**: `false` (must remain false until verification complete)

---

## Pre-Verification Checklist

### ✅ Step 1: Confirm Flags and Environment

**Baseline State (MUST be true before starting)**:
- [ ] `ENABLE_FORM_MAPPER_V1=false` in staging environment
- [ ] `ENABLE_AUTH_PROTECTION=false` (unless explicitly testing auth)
- [ ] Staging environment is accessible and stable
- [ ] Database backup available (recommended)

**Verification Commands** (Run in staging repo):
```bash
# 1. Type checking
npm run typecheck
# Expected: No errors

# 2. Build
npm run build
# Expected: Build succeeds

# 3. Mapper unit tests
npm test form-to-booking-mapper
# Expected: All 22 tests pass

# 4. Form route integration tests
npm test form-route-integration
# Expected: Tests pass (Redis connection errors acceptable if Redis unavailable)
```

---

## Verification Sequence

### Step 2: Enable Mapper in Staging

**Action**:
1. Set `ENABLE_FORM_MAPPER_V1=true` in staging environment variables
2. Restart staging application
3. Verify application starts without errors
4. Check logs for mapper initialization messages

**Verification**:
- [ ] Application starts successfully
- [ ] No errors in startup logs
- [ ] Health endpoint responds: `/api/health`

---

### Step 3: Submit 5 Test Bookings

**Process**: Submit 5 real bookings through the actual public booking form (not API directly)

**For each booking, verify the following checklist**:

#### Booking Verification Checklist (from PHASE_1_ACCEPTANCE_CHECKLIST.md)

1. **Client Name and Contact Fields**
   - [ ] First name matches form input exactly
   - [ ] Last name matches form input exactly
   - [ ] Phone number matches form input (formatting preserved)
   - [ ] Email matches form input (if provided)
   - [ ] Address matches form input (if provided)

2. **Pets Array**
   - [ ] Number of pets matches form selection
   - [ ] Pet names match form input exactly
   - [ ] Pet species match form selection exactly
   - [ ] Order of pets preserved

3. **Service Type**
   - [ ] Service type matches form selection exactly
   - [ ] Service name normalized correctly (e.g., "Drop-ins" vs "Drop ins")

4. **Date and Time Slots**
   - [ ] Start date/time matches form input in correct timezone
   - [ ] End date/time matches form input in correct timezone
   - [ ] Time slots array matches form selection
   - [ ] All time slots have correct startAt, endAt, duration
   - [ ] Local time conversion is correct (America/Chicago)

5. **Notes Field**
   - [ ] Notes content matches form input
   - [ ] Precedence correct: specialInstructions > additionalNotes > notes
   - [ ] Notes stored correctly in database
   - [ ] Notes display correctly in dashboard

6. **Quantity**
   - [ ] Quantity is correct and deterministic
   - [ ] Quantity calculation matches expected logic:
     - Housesitting: number of nights
     - Visit-based services: number of time slots
     - Default: 1 if no specific logic applies

7. **Pricing Consistency**
   - [ ] Calendar view total matches booking total
   - [ ] Sitter view total matches booking total
   - [ ] Dashboard view total matches booking total
   - [ ] No price discrepancies between views

8. **Payment State**
   - [ ] Invoice/payment link state unchanged
   - [ ] Payment status is correct (likely "unpaid" for new bookings)
   - [ ] Stripe payment link generation works (if applicable)

9. **Booking Status**
   - [ ] Status is correct (likely "pending" for new bookings)
   - [ ] Created timestamp is recent
   - [ ] Updated timestamp matches created timestamp

10. **Database Integrity**
    - [ ] Booking record exists in database
    - [ ] All related records created (pets, timeSlots)
    - [ ] No orphaned records
    - [ ] Foreign key relationships correct

---

### Step 4: Stop Conditions

**IMMEDIATE STOP if**:
- ❌ Any booking fails ANY checklist item
- ❌ Price discrepancies detected
- ❌ Data corruption or missing fields
- ❌ Application errors in logs
- ❌ Unexpected behavior in any view

**Rollback Procedure**:
1. Set `ENABLE_FORM_MAPPER_V1=false` in staging
2. Restart staging application
3. Document the failure in detail
4. Do NOT proceed to production

---

### Step 5: Production Enablement (Only After 5 Clean Bookings)

**Prerequisites**:
- ✅ All 5 staging bookings verified successfully
- ✅ No errors in staging logs
- ✅ All checklist items passed for all 5 bookings

**Production Process**:
1. Choose low traffic window (e.g., early morning)
2. Set `ENABLE_FORM_MAPPER_V1=true` in production environment
3. Restart production application
4. Verify application starts successfully

**Initial Production Verification**:
- Submit 1 real booking through production form
- Verify same checklist as staging
- If successful, proceed to 3 more bookings
- After 4 total production bookings pass, verification complete

**Production Rollback**:
- Set `ENABLE_FORM_MAPPER_V1=false`
- Restart production
- That's the whole rollback (one flag flip)

---

## Verification Log Template

Use this template to log each booking verification:

```
Booking #X Verification
Date: YYYY-MM-DD HH:MM
Booking ID: [from dashboard]
Form Input: [summary]

✅ Client Name: [verified/issue]
✅ Contact Fields: [verified/issue]
✅ Pets Array: [verified/issue]
✅ Service Type: [verified/issue]
✅ Date/Time Slots: [verified/issue]
✅ Notes: [verified/issue]
✅ Quantity: [verified/issue]
✅ Pricing Consistency: [verified/issue]
✅ Payment State: [verified/issue]
✅ Booking Status: [verified/issue]
✅ Database Integrity: [verified/issue]

Overall: PASS / FAIL
Notes: [any observations]
```

---

## Success Criteria

**Staging Verification Success**:
- ✅ All 5 bookings pass all checklist items
- ✅ No errors in application logs
- ✅ No price discrepancies
- ✅ All data integrity checks pass

**Production Verification Success**:
- ✅ At least 4 production bookings pass all checklist items
- ✅ No errors in application logs
- ✅ Production metrics stable
- ✅ No customer complaints

---

## Rollback Safety

**One Flag Flip Rollback**:
- Simply set `ENABLE_FORM_MAPPER_V1=false` and restart
- Legacy code path remains intact and tested
- Zero risk to revenue (form route works with flag false)
- Instant rollback capability

**Why This is Safe**:
- Feature flag defaults to false
- Legacy path is preserved and tested
- No database schema changes
- No pricing logic changes in Phase 1
- Response shape unchanged

---

## Next Steps After Verification

Once production verification is complete:
1. Monitor production logs for 24-48 hours
2. Watch for any anomalies in booking creation
3. Keep flag enabled if all metrics are normal
4. Document lessons learned
5. Proceed to Phase 2 pricing engine verification (when ready)

