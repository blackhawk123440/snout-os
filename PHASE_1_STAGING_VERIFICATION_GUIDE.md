# Phase 1 Staging Verification Guide

**Purpose**: Verify Phase 1 (Form to Dashboard Wiring Map) in staging environment  
**Date**: 2024-12-30  
**Status**: ⚠️ PENDING

---

## Pre-Verification: Freeze Production Baseline

### Step 1: Confirm Production Baseline
**Action Required**: Manually verify in production environment

```bash
# In production environment, verify:
echo $ENABLE_FORM_MAPPER_V1
# Expected output: (empty or false)

# Or check environment variable directly in production:
# ENABLE_FORM_MAPPER_V1 should be unset or explicitly set to false
```

**Verification Checklist**:
- [ ] Production environment variable `ENABLE_FORM_MAPPER_V1` is `false` or unset
- [ ] Production application is running normally
- [ ] Production booking form is working (test with 1 booking if needed)
- [ ] Document production baseline status: ___________

**⚠️ DO NOT CHANGE PRODUCTION ENVIRONMENT VARIABLES**

---

## Enable Phase 1 in Staging Only

### Step 2: Enable Mapper in Staging
**Action Required**: Set environment variable in staging environment

```bash
# In staging environment:
export ENABLE_FORM_MAPPER_V1=true
# OR set in staging .env file:
# ENABLE_FORM_MAPPER_V1=true

# Restart staging application
# (Method depends on your hosting: Render, Vercel, etc.)
```

**Verification Checklist**:
- [ ] Staging environment variable `ENABLE_FORM_MAPPER_V1` is set to `true`
- [ ] Staging application restarted successfully
- [ ] Staging health endpoint returns OK: `curl https://your-staging-url/api/health`
- [ ] Staging application logs show no errors on startup
- [ ] Document staging URL: ___________

---

## Test Booking Specifications

### Booking 1: Simple One Pet, One Time Slot, Short Notes

**Payload Structure**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "5551234567",
  "email": "john.doe@example.com",
  "address": "123 Main St, City, ST 12345",
  "service": "Dog Walking",
  "selectedDates": [
    {
      "date": "2024-12-31",
      "startTime": "10:00",
      "endTime": "11:00"
    }
  ],
  "pets": [
    {
      "name": "Buddy",
      "species": "Dog",
      "breed": "Golden Retriever"
    }
  ],
  "notes": "Short note about the walk",
  "timezone": "America/Chicago"
}
```

**Expected Results**:
- Notes field: `"Short note about the walk"`
- TimeSlots: 1 slot, startAt/endAt correctly parsed
- Quantity: `1` (single time slot)
- Pets: 1 pet with correct species
- No timezone shifts
- All basic fields mapped correctly

---

### Booking 2: Multiple Pets, Longer Notes, Special Instructions

**Payload Structure**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "5559876543",
  "email": "jane.smith@example.com",
  "address": "456 Oak Ave, City, ST 67890",
  "service": "Drop-ins",
  "selectedDates": [
    {
      "date": "2024-12-31",
      "startTime": "14:00",
      "endTime": "15:00"
    }
  ],
  "pets": [
    {
      "name": "Max",
      "species": "Dog",
      "breed": "German Shepherd"
    },
    {
      "name": "Luna",
      "species": "Cat",
      "breed": "Siamese"
    }
  ],
  "notes": "This is a longer note with more details about the pets and their care needs.",
  "specialInstructions": "Please use the side door. Feed Max twice, Luna once. Max needs medication at 2pm.",
  "additionalNotes": "Both pets are friendly but Max can be anxious around strangers.",
  "timezone": "America/Chicago"
}
```

**Expected Results**:
- Notes field: `"Please use the side door. Feed Max twice, Luna once. Max needs medication at 2pm."` (specialInstructions precedence)
- TimeSlots: 1 slot
- Quantity: `1`
- Pets: 2 pets, both species correct
- Notes precedence: specialInstructions > additionalNotes > notes
- All fields mapped correctly

---

### Booking 3: Same Day Booking, Time Near Midnight

**Payload Structure**:
```json
{
  "firstName": "Bob",
  "lastName": "Wilson",
  "phone": "5555551234",
  "email": "bob.wilson@example.com",
  "address": "789 Pine Rd, City, ST 11223",
  "service": "Drop-ins",
  "selectedDates": [
    {
      "date": "2024-12-31",
      "startTime": "23:30",
      "endTime": "00:30"
    }
  ],
  "pets": [
    {
      "name": "Charlie",
      "species": "Dog",
      "breed": "Beagle"
    }
  ],
  "notes": "Late night visit",
  "timezone": "America/Chicago"
}
```

**Expected Results**:
- Notes field: `"Late night visit"`
- TimeSlots: 1 slot, correctly handles midnight crossover
- startAt: Date should be 2024-12-31 23:30:00
- endAt: Date should be 2025-01-01 00:30:00 (next day)
- Quantity: `1`
- Timezone conversion handled correctly (no shifts)
- All fields mapped correctly

---

### Booking 4: Multi-Day or Multiple Time Slots

**Payload Structure**:
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "phone": "5554445566",
  "email": "alice.johnson@example.com",
  "address": "321 Elm St, City, ST 44556",
  "service": "Housesitting",
  "selectedDates": [
    {
      "date": "2024-12-31",
      "startTime": "08:00",
      "endTime": "20:00"
    },
    {
      "date": "2025-01-01",
      "startTime": "08:00",
      "endTime": "20:00"
    },
    {
      "date": "2025-01-02",
      "startTime": "08:00",
      "endTime": "12:00"
    }
  ],
  "pets": [
    {
      "name": "Daisy",
      "species": "Dog",
      "breed": "Labrador"
    }
  ],
  "notes": "Multi-day housesitting booking",
  "timezone": "America/Chicago"
}
```

**Expected Results**:
- Notes field: `"Multi-day housesitting booking"`
- TimeSlots: 3 slots (or calculated nights for housesitting)
- Quantity: 
  - If housesitting: `2` (nights: selectedDates.length - 1)
  - If other service: `3` (timeSlots.length)
- startAt: First date/time (2024-12-31 08:00:00)
- endAt: Last date/time (2025-01-02 12:00:00)
- All time slots created correctly
- Quantity calculation matches service type
- All fields mapped correctly

---

### Booking 5: Weird Case - Blank Notes vs Other Notes Fields

**Payload Structure**:
```json
{
  "firstName": "Test",
  "lastName": "Case",
  "phone": "5557778888",
  "email": "test.case@example.com",
  "address": "999 Test Ln, City, ST 77889",
  "service": "Dog Walking",
  "selectedDates": [
    {
      "date": "2024-12-31",
      "startTime": "12:00",
      "endTime": "13:00"
    }
  ],
  "pets": [
    {
      "name": "TestPet",
      "species": "Dog"
    }
  ],
  "notes": "",
  "specialInstructions": "This should be used because notes is blank",
  "additionalNotes": "This should not be used (lower precedence)",
  "timezone": "America/Chicago"
}
```

**Expected Results**:
- Notes field: `"This should be used because notes is blank"` (specialInstructions precedence)
- Precedence rule: specialInstructions > additionalNotes > notes (when notes is blank)
- TimeSlots: 1 slot
- Quantity: `1`
- All fields mapped correctly
- Precedence rules correctly applied for blank/empty fields

---

## Verification Process

For each booking:

1. **Submit Booking**: Submit through the public booking form in staging
2. **Capture Booking ID**: Note the booking ID from the response
3. **Check Dashboard**: Verify booking appears in dashboard
4. **Check Database**: Query database for the booking record
5. **Fill Checklist**: Complete the detailed checklist for each booking below
6. **Log Results**: Document any discrepancies

### Stop Conditions

**If ANY booking fails ANY checklist item**:
1. **STOP IMMEDIATELY**
2. Set `ENABLE_FORM_MAPPER_V1=false` in staging
3. Restart staging application
4. Log the exact failure:
   - Booking number: ___
   - Checklist item failed: ___
   - Expected value: ___
   - Actual value: ___
   - Booking ID: ___
   - Raw payload: (paste here)
5. **DO NOT PROCEED** until the issue is fixed and verified

---

## Detailed Checklists by Booking

### Booking 1 Checklist

**Booking ID**: ___________

- [ ] Booking submitted successfully (HTTP 200/201)
- [ ] Booking appears in dashboard
- [ ] **Notes**: `"Short note about the walk"` (exact match)
- [ ] **First Name**: `"John"`
- [ ] **Last Name**: `"Doe"`
- [ ] **Phone**: Correctly formatted
- [ ] **Email**: `"john.doe@example.com"`
- [ ] **Address**: `"123 Main St, City, ST 12345"`
- [ ] **Service**: `"Dog Walking"`
- [ ] **TimeSlots**: Count = 1
- [ ] **TimeSlots**: startAt = 2024-12-31 10:00:00 (no timezone shift)
- [ ] **TimeSlots**: endAt = 2024-12-31 11:00:00 (no timezone shift)
- [ ] **Quantity**: `1` (matches timeSlots.length)
- [ ] **Pets**: Count = 1
- [ ] **Pets**: First pet species = `"Dog"`
- [ ] **Pets**: First pet name = `"Buddy"`
- [ ] **Response shape**: Consistent with previous responses
- [ ] **Pricing**: Not changed (same as baseline behavior)

**Issues Found**: ___________

---

### Booking 2 Checklist

**Booking ID**: ___________

- [ ] Booking submitted successfully (HTTP 200/201)
- [ ] Booking appears in dashboard
- [ ] **Notes**: `"Please use the side door. Feed Max twice, Luna once. Max needs medication at 2pm."` (specialInstructions precedence)
- [ ] **First Name**: `"Jane"`
- [ ] **Last Name**: `"Smith"`
- [ ] **Phone**: Correctly formatted
- [ ] **Email**: `"jane.smith@example.com"`
- [ ] **Address**: `"456 Oak Ave, City, ST 67890"`
- [ ] **Service**: `"Drop-ins"`
- [ ] **TimeSlots**: Count = 1
- [ ] **TimeSlots**: startAt/endAt correct (no timezone shift)
- [ ] **Quantity**: `1` (matches timeSlots.length)
- [ ] **Pets**: Count = 2
- [ ] **Pets**: First pet species = `"Dog"`, name = `"Max"`
- [ ] **Pets**: Second pet species = `"Cat"`, name = `"Luna"`
- [ ] **Notes precedence**: specialInstructions used (highest priority)
- [ ] **Response shape**: Consistent
- [ ] **Pricing**: Not changed

**Issues Found**: ___________

---

### Booking 3 Checklist

**Booking ID**: ___________

- [ ] Booking submitted successfully (HTTP 200/201)
- [ ] Booking appears in dashboard
- [ ] **Notes**: `"Late night visit"`
- [ ] **First Name**: `"Bob"`
- [ ] **Last Name**: `"Wilson"`
- [ ] **TimeSlots**: Count = 1
- [ ] **TimeSlots**: startAt = 2024-12-31 23:30:00 (correct date)
- [ ] **TimeSlots**: endAt = 2025-01-01 00:30:00 (next day, correct)
- [ ] **Midnight crossover**: Handled correctly (no date errors)
- [ ] **Timezone**: No unexpected shifts
- [ ] **Quantity**: `1`
- [ ] **Pets**: Count = 1, species = `"Dog"`
- [ ] **Response shape**: Consistent
- [ ] **Pricing**: Not changed

**Issues Found**: ___________

---

### Booking 4 Checklist

**Booking ID**: ___________

- [ ] Booking submitted successfully (HTTP 200/201)
- [ ] Booking appears in dashboard
- [ ] **Notes**: `"Multi-day housesitting booking"`
- [ ] **First Name**: `"Alice"`
- [ ] **Last Name**: `"Johnson"`
- [ ] **Service**: `"Housesitting"`
- [ ] **TimeSlots**: Count = 3 (or calculated correctly for housesitting)
- [ ] **TimeSlots**: All dates/times correct (no shifts)
- [ ] **Quantity**: 
  - If housesitting: `2` (nights: selectedDates.length - 1)
  - If other service: `3` (timeSlots.length)
- [ ] **startAt**: First date/time (2024-12-31 08:00:00)
- [ ] **endAt**: Last date/time (2025-01-02 12:00:00)
- [ ] **Quantity calculation**: Matches service type rules
- [ ] **Pets**: Count = 1, species = `"Dog"`
- [ ] **Response shape**: Consistent
- [ ] **Pricing**: Not changed

**Issues Found**: ___________

---

### Booking 5 Checklist

**Booking ID**: ___________

- [ ] Booking submitted successfully (HTTP 200/201)
- [ ] Booking appears in dashboard
- [ ] **Notes**: `"This should be used because notes is blank"` (specialInstructions, NOT notes field)
- [ ] **Notes precedence**: specialInstructions used (notes was blank/empty)
- [ ] **First Name**: `"Test"`
- [ ] **Last Name**: `"Case"`
- [ ] **TimeSlots**: Count = 1
- [ ] **TimeSlots**: startAt/endAt correct
- [ ] **Quantity**: `1`
- [ ] **Pets**: Count = 1, species = `"Dog"`
- [ ] **Empty field handling**: Blank notes field handled correctly
- [ ] **Precedence rules**: Correctly applied (specialInstructions > additionalNotes > notes)
- [ ] **Response shape**: Consistent
- [ ] **Pricing**: Not changed

**Issues Found**: ___________

---

## Final Verification

Only complete this section **AFTER ALL 5 BOOKINGS PASS**:

- [ ] All 5 bookings submitted successfully
- [ ] All 5 bookings verified in dashboard
- [ ] All 5 bookings verified in database
- [ ] All checklist items passed for all 5 bookings
- [ ] No issues found
- [ ] Response shapes consistent across all bookings
- [ ] Pricing behavior unchanged (baseline maintained)
- [ ] Mapping reports logged in EventLog (check logs)

**Phase 1 Status**: ✅ **VERIFIED**

**Date Verified**: ___________

**Verified By**: ___________

**Staging URL**: ___________

---

## Rollback Instructions

If verification fails, immediately execute:

```bash
# In staging environment:
export ENABLE_FORM_MAPPER_V1=false
# OR remove from .env file
# Restart staging application
```

Then document the failure and fix before retrying.

---

**Last Updated**: 2024-12-30

