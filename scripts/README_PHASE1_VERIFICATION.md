# Phase 1 Staging Verification - Automated Script

This script automates the Phase 1 verification process by submitting 5 test bookings programmatically and verifying they match the acceptance criteria.

## Prerequisites

1. Staging environment running with the form API endpoint accessible
2. Environment variable `ENABLE_FORM_MAPPER_V1` set to `true` in staging (for testing with mapper) or `false` (to test existing behavior)

## Usage

### Option 1: Test Against Staging

```bash
BASE_URL=https://your-staging-url.onrender.com npx tsx scripts/phase1-staging-verification.ts
```

Replace `your-staging-url.onrender.com` with your actual staging URL.

### Option 2: Test Against Local Dev

```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Run verification script
BASE_URL=http://localhost:3000 npx tsx scripts/phase1-staging-verification.ts
```

### Option 3: Test Against Production (ONLY after staging passes)

```bash
BASE_URL=https://your-production-url.com npx tsx scripts/phase1-staging-verification.ts
```

## What It Tests

The script submits 5 test bookings:

1. **Basic booking with specialInstructions** - Tests notes precedence (specialInstructions)
2. **Booking with additionalNotes** - Tests notes precedence (additionalNotes)
3. **Booking with direct notes field** - Tests notes precedence (notes), housesitting quantity calculation
4. **Pet Taxi with addresses** - Tests pickup/dropoff address handling
5. **Multiple time slots with pets array** - Tests time slots, quantity calculation, pets array format

For each booking, it verifies:
- ✅ Notes field matches expected value (respecting precedence rules)
- ✅ Service type is correct
- ✅ Pet count is correct
- ✅ Quantity is correct (nights for housesitting, visits for others)
- ✅ Addresses are correct (pickup/dropoff for Pet Taxi, address for others)

## Output

The script prints:
- Progress for each test booking submission
- Verification results for each booking
- Summary with pass/fail counts
- Detailed failure messages if any tests fail

## Expected Results

### With `ENABLE_FORM_MAPPER_V1=false` (existing behavior)
- All tests should pass (existing code handles these cases)

### With `ENABLE_FORM_MAPPER_V1=true` (new mapper)
- All tests should pass if mapper is working correctly
- If tests fail, check server logs for mapper errors

## If Tests Fail

1. **Check server logs** for mapper errors (look for `[Form Mapper V1]` log entries)
2. **Verify environment variable** is set correctly in your staging environment
3. **Check database** directly to see what was actually stored
4. **Review booking IDs** from the output to inspect specific bookings

## Manual Verification (Alternative)

If you prefer to submit bookings manually through the UI, use `PHASE_1_ACCEPTANCE_CHECKLIST.md` instead.

## Next Steps

- ✅ All 5 tests pass → Proceed to production enablement
- ❌ Any test fails → Review failures, check mapper logs, fix issues, re-run

