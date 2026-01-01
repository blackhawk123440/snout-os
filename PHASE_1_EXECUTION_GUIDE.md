# Phase 1 Execution Guide: Safe Rollout and Verification

## 🎯 Objective
Safely enable Phase 1 form mapper in staging, verify correctness, then enable in production with zero revenue risk.

## ⚠️ Critical Safety Rule
**Never proceed to the next step if the previous step fails. Rollback immediately if anything looks wrong.**

---

## Step 1: Lock Baseline (Safe Rollback State)

### 1.1 Confirm Production State
**Action**: Verify production environment variables

**Check**:
- `ENABLE_FORM_MAPPER_V1=false` (or not set, which defaults to false)
- This is your **safe rollback state**

**Command** (if you have access to production env):
```bash
# Check environment variable (method depends on your hosting)
# Render: Check Environment tab
# Vercel: Check Environment Variables in dashboard
# Local: Check .env or .env.production
```

**Expected Result**: 
- ✅ Flag is `false` or unset
- ✅ Production is running existing form handling logic
- ✅ No mapper code is executing

**If flag is already `true` in production**: 
- ⛔ **STOP IMMEDIATELY**
- Set `ENABLE_FORM_MAPPER_V1=false`
- Restart production server
- Verify production bookings work correctly
- Document why flag was enabled before verification

---

## Step 2: Run Tests (Prove Phase 1 is Not Lying)

### 2.1 Run All Tests
**Action**: Run full test suite to ensure nothing is broken

**Command**:
```bash
npm test
```

**Expected Result**: 
- ✅ All tests pass
- ✅ No new failures introduced

**If tests fail**:
- ⛔ **STOP IMMEDIATELY**
- Fix failing tests
- Do not proceed to staging until all tests pass
- Document what failed and why

### 2.2 Run Mapper Unit Tests
**Action**: Verify mapper logic works correctly

**Command**:
```bash
npm test form-to-booking-mapper
```

**Expected Result**:
- ✅ All mapper tests pass
- ✅ Notes precedence verified
- ✅ Timezone conversion verified
- ✅ Quantity calculation verified
- ✅ Field preservation verified

**If tests fail**:
- ⛔ **STOP IMMEDIATELY**
- Review test failures
- Fix mapper logic
- Re-run tests until all pass
- Do not proceed to staging

### 2.3 Run Integration Tests
**Action**: Verify form route integration works

**Command**:
```bash
npm test form-route-integration
```

**Expected Result**:
- ✅ Integration tests pass
- ✅ Flag OFF path works (existing behavior)
- ✅ Flag ON path works (mapper path)
- ✅ Validation errors return correctly
- ✅ Response shape is consistent

**If tests fail**:
- ⛔ **STOP IMMEDIATELY**
- Review integration test failures
- Fix route integration logic
- Re-run tests until all pass
- Do not proceed to staging

---

## Step 3: Staging Enablement (Tight Acceptance Checklist)

### 3.1 Enable Flag in Staging
**Action**: Set feature flag to `true` in staging environment

**Command**:
```bash
# Set in staging environment (method depends on hosting)
ENABLE_FORM_MAPPER_V1=true
```

**Restart staging server**:
```bash
# Render: Restart service from dashboard
# Vercel: Redeploy or restart
# Local staging: npm run dev (with flag set)
```

**Verify flag is enabled**:
- ✅ Check environment variables confirm `ENABLE_FORM_MAPPER_V1=true`
- ✅ Server restarted successfully
- ✅ Server logs show application started

### 3.2 Submit 5 Real Test Bookings

**Action**: Submit 5 bookings through the actual booking form in staging

**Test Cases**:

#### Test Booking 1: Notes Precedence (specialInstructions)
```json
{
  "firstName": "Test",
  "lastName": "User1",
  "phone": "5551111111",
  "email": "test1@example.com",
  "service": "Dog Walking",
  "startAt": "2024-12-15T10:00:00Z",
  "endAt": "2024-12-15T11:00:00Z",
  "address": "123 Test St",
  "specialInstructions": "Use side door",
  "additionalNotes": "Park in driveway",
  "notes": "Ring doorbell"
}
```
**Expected**: `notes` field in booking = "Use side door"

#### Test Booking 2: Notes Precedence (additionalNotes)
```json
{
  "firstName": "Test",
  "lastName": "User2",
  "phone": "5552222222",
  "email": "test2@example.com",
  "service": "Drop-ins",
  "startAt": "2024-12-16T09:00:00Z",
  "endAt": "2024-12-16T10:00:00Z",
  "address": "456 Test Ave",
  "specialInstructions": null,
  "additionalNotes": "Key under mat",
  "notes": "Leave food bowl"
}
```
**Expected**: `notes` field in booking = "Key under mat"

#### Test Booking 3: House Sitting Quantity
```json
{
  "firstName": "Test",
  "lastName": "User3",
  "phone": "5553333333",
  "email": "test3@example.com",
  "service": "Housesitting",
  "startAt": "2024-12-17T08:00:00Z",
  "endAt": "2024-12-19T20:00:00Z",
  "selectedDates": ["2024-12-17", "2024-12-18", "2024-12-19"],
  "dateTimes": {
    "2024-12-17": [{"time": "08:00 AM", "duration": 60}],
    "2024-12-19": [{"time": "08:00 PM", "duration": 60}]
  },
  "notes": "Water plants daily"
}
```
**Expected**: `quantity` = 2 (3 dates - 1 = 2 nights)

#### Test Booking 4: Dog Walking Multiple Time Slots
```json
{
  "firstName": "Test",
  "lastName": "User4",
  "phone": "5554444444",
  "email": "test4@example.com",
  "service": "Dog Walking",
  "startAt": "2024-12-18T10:00:00Z",
  "endAt": "2024-12-18T12:00:00Z",
  "address": "789 Test Blvd",
  "selectedDates": ["2024-12-18"],
  "dateTimes": {
    "2024-12-18": [
      {"time": "10:00 AM", "duration": 30},
      {"time": "02:00 PM", "duration": 30}
    ]
  },
  "notes": "Two walks needed"
}
```
**Expected**: `quantity` = 2 (number of time slots)

#### Test Booking 5: Pet Taxi with Addresses
```json
{
  "firstName": "Test",
  "lastName": "User5",
  "phone": "5555555555",
  "email": "test5@example.com",
  "service": "Pet Taxi",
  "startAt": "2024-12-19T14:00:00Z",
  "endAt": "2024-12-19T15:00:00Z",
  "pickupAddress": "100 Pickup St",
  "dropoffAddress": "200 Dropoff Ave",
  "notes": "Friendly dog"
}
```
**Expected**: Both `pickupAddress` and `dropoffAddress` saved correctly

### 3.3 Verify Each Booking (Acceptance Checklist)

For **each** of the 5 bookings, verify:

#### ✅ Notes Field
- [ ] Notes value matches expected precedence rule
- [ ] No notes overwritten by wrong field
- [ ] Notes are trimmed correctly (no leading/trailing whitespace)
- [ ] Empty notes fields result in `null` (not empty string)

**Verification Method**: Check booking in dashboard, view booking details modal

#### ✅ Times (startAt/endAt)
- [ ] `startAt` matches what client selected (check in local timezone)
- [ ] `endAt` matches what client selected (check in local timezone)
- [ ] Times stored consistently (no timezone conversion errors)
- [ ] For house sitting: times use first and last selected dates correctly

**Verification Method**: Check booking details, compare with form submission time

#### ✅ Quantity
- [ ] Quantity calculated deterministically based on service type
- [ ] House sitting: quantity = selectedDates.length - 1
- [ ] Other services: quantity = timeSlots.length
- [ ] Matches your expectation for each test case

**Verification Method**: Check booking details, verify quantity field

#### ✅ Pets Array
- [ ] All pets preserved correctly
- [ ] Pet names and species correct
- [ ] Pet count matches form submission
- [ ] No pets dropped or duplicated

**Verification Method**: Check booking details, view pets section

#### ✅ All Fields Preserved
- [ ] `firstName` correct
- [ ] `lastName` correct
- [ ] `phone` formatted correctly (E.164 format)
- [ ] `email` correct (or null if not provided)
- [ ] `address` correct (or null if not required)
- [ ] `pickupAddress` correct (for Pet Taxi)
- [ ] `dropoffAddress` correct (for Pet Taxi)
- [ ] `service` correct
- [ ] `status` = "pending"
- [ ] `paymentStatus` = "unpaid"
- [ ] No fields missing or null when they should have values

**Verification Method**: Check booking details, verify all fields

#### ✅ TimeSlots (if applicable)
- [ ] TimeSlots created correctly
- [ ] `startAt`, `endAt`, `duration` correct for each slot
- [ ] Number of slots matches form submission

**Verification Method**: Check booking details, view time slots

#### ✅ Pricing Output Unchanged
- [ ] `totalPrice` calculated same as before (Phase 1 doesn't change pricing)
- [ ] Price matches what existing logic would produce
- [ ] No price changes due to mapper

**Verification Method**: Compare with existing booking of same type, or disable flag and compare

### 3.4 Check Server Logs

**Action**: Verify mapping reports are logged correctly

**Check**:
- [ ] Mapping report logs appear: `[Form Mapper V1] Mapping report:`
- [ ] No raw notes content in logs (should show `[REDACTED - N chars]`)
- [ ] Phone numbers redacted (only last 4 digits shown)
- [ ] Emails redacted (only domain shown)
- [ ] No PII (personally identifiable information) in logs

**Verification Method**: Check server logs/console output

**If PII found in logs**:
- ⛔ **STOP IMMEDIATELY**
- Fix redaction logic
- Verify no PII in new logs
- Do not proceed to production

### 3.5 Failure Response

**If ANY verification fails**:
1. ⛔ **IMMEDIATELY** set `ENABLE_FORM_MAPPER_V1=false` in staging
2. Restart staging server
3. Verify staging returns to safe state
4. Document what failed
5. Fix the issue
6. Re-run Step 3 from the beginning (enable flag, submit bookings, verify)

**Do NOT proceed to production until all 5 bookings pass all checks.**

---

## Step 4: Production Enablement (Low Traffic Window)

### 4.1 Pre-Enablement Checklist
- [ ] All staging tests passed (Step 3 complete)
- [ ] All 5 test bookings verified correctly
- [ ] No PII in logs
- [ ] Rollback plan tested and ready
- [ ] Low traffic window identified (e.g., 2-3 AM local time)

### 4.2 Enable Flag in Production

**Action**: Set feature flag to `true` in production

**Command**:
```bash
# Set in production environment
ENABLE_FORM_MAPPER_V1=true
```

**Restart production server**:
- Render: Restart service from dashboard
- Vercel: Redeploy or restart
- Other: Use your deployment method

**Verify**:
- ✅ Flag is set correctly
- ✅ Server restarted successfully
- ✅ Server is responding

### 4.3 First Production Booking

**Action**: Submit 1 test booking yourself

**Verification**:
- [ ] Booking created successfully
- [ ] All fields correct (use checklist from Step 3.3)
- [ ] Notes correct
- [ ] Times correct
- [ ] Quantity correct
- [ ] Pricing unchanged

**If anything looks off**:
- ⛔ **IMMEDIATELY** set `ENABLE_FORM_MAPPER_V1=false`
- Restart production server
- Investigate issue
- Do not proceed until fixed and re-verified in staging

### 4.4 Three More Production Bookings

**Action**: Monitor 3 more real bookings (or submit 3 more test bookings)

**For each booking**:
- [ ] Verify all fields correct (use checklist)
- [ ] Check logs for mapping reports
- [ ] Verify no errors

**If any booking has issues**:
- ⛔ **IMMEDIATELY** set `ENABLE_FORM_MAPPER_V1=false`
- Restart production server
- Document issue
- Fix and re-verify in staging before re-enabling

### 4.5 Leave Flag On

**If all 4 production bookings pass**:
- ✅ Leave `ENABLE_FORM_MAPPER_V1=true` enabled
- ✅ Monitor logs for next 24 hours
- ✅ Spot-check a few more bookings
- ✅ Phase 1 is now live in production

---

## Step 5: Rollback (If Needed)

### 5.1 Immediate Rollback

**If issues detected at ANY point**:

1. **Set Flag**:
   ```bash
   ENABLE_FORM_MAPPER_V1=false
   ```

2. **Restart Server**:
   - Restart immediately

3. **Verify Rollback**:
   - Submit test booking
   - Verify existing behavior restored
   - Check mapper logs no longer appear

4. **Document Issue**:
   - What failed
   - When it failed
   - What was the state when it failed

5. **Fix and Re-test**:
   - Fix the issue
   - Re-run Step 2 (tests)
   - Re-run Step 3 (staging)
   - Only then re-enable in production

**Rollback Time**: < 1 minute (one environment variable change + restart)

---

## Next Phases (After Phase 1 Proven)

### Phase 2: Pricing Unification
**Priority**: HIGH (biggest revenue truth risk)
**Goal**: Single pricing engine, single source of truth
**Status**: Current pricing logic is scattered across form, calendar, sitter dashboard, scripts

### Phase 3: Automation Settings Persistence
**Priority**: HIGH (biggest operations pain)
**Goal**: Automation settings actually persist, no more UI lies
**Status**: Settings appear to save but don't actually change

### Phase 4: Sitter Tiers and Dashboard
**Priority**: MEDIUM
**Goal**: Complete sitter tier system and comprehensive sitter dashboard

**Recommended Order**:
1. Phase 1 ✅ (Form to Dashboard Wiring)
2. Phase 2 (Pricing Unification) ← Do this next
3. Phase 3 (Automation Persistence)
4. Phase 4 (Sitter Tiers/Dashboard)

---

## Success Criteria

Phase 1 is successful when:
- ✅ All tests pass
- ✅ All 5 staging bookings verified correctly
- ✅ All 4 production bookings verified correctly
- ✅ No PII in logs
- ✅ Pricing output unchanged
- ✅ Flag enabled in production
- ✅ System stable for 24 hours

**Only then proceed to Phase 2.**

