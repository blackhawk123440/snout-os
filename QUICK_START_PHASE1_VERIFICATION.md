# Quick Start: Phase 1 Verification

## The Fastest Way to Verify Phase 1

I've created an automated script that submits 5 test bookings and verifies them automatically.

## Step 1: Run the Verification Script

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"

# For staging:
BASE_URL=https://your-staging-url.onrender.com npx tsx scripts/phase1-staging-verification.ts

# For local testing:
BASE_URL=http://localhost:3000 npx tsx scripts/phase1-staging-verification.ts
```

**Replace `your-staging-url.onrender.com` with your actual staging URL.**

## Step 2: Check the Results

The script will:
- ✅ Submit 5 test bookings automatically
- ✅ Verify each booking against acceptance criteria
- ✅ Print a summary with pass/fail counts

## Step 3: Interpret Results

### If All Tests Pass ✅
- Phase 1 mapper is working correctly
- Proceed to enable in production

### If Tests Fail ❌
1. Check if `ENABLE_FORM_MAPPER_V1` is set correctly in your environment
2. Check server logs for `[Form Mapper V1]` entries
3. Review the failure messages for specific issues

## What Gets Tested

The script tests:
1. Notes precedence (specialInstructions > additionalNotes > notes)
2. Service type mapping
3. Pet count and species
4. Quantity calculation (nights vs visits)
5. Address handling (regular vs pickup/dropoff)
6. Time slots and multiple bookings

## No Manual Work Required

You don't need to:
- Open the booking form UI
- Fill out forms manually
- Check each booking in the dashboard
- Compare fields manually

The script does everything programmatically and reports results.

## Full Documentation

See `scripts/README_PHASE1_VERIFICATION.md` for detailed documentation.

