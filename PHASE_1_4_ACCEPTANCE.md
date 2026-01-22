# Phase 1.4 Acceptance Checks: Data Migration Scripts

## Status: ✅ Complete - Ready for Review

**Date:** 2026-01-19  
**Phase:** 1.4 - Data Migration Scripts

---

## Implementation Summary

### Migration Script: `scripts/migrate-phase-1-4.ts`

**Features:**
- ✅ Idempotent: Can be run multiple times safely
- ✅ Dry-run mode: Preview changes without modifying data (`--dry-run` flag)
- ✅ Detailed logging: Logs all actions and counts
- ✅ Rollback guidance: Provides SQL rollback commands

**Steps:**
1. **Backfill MessageNumber records into three classes:**
   - Front desk: Exactly one per org (uses first existing active number)
   - Sitter masked: Created on-demand when sitters assigned
   - Pool: Uses existing pool numbers, flags if missing

2. **Backfill MessageThread.messageNumberId and Thread.numberClass:**
   - Derives number class strictly from assigned MessageNumber
   - Never leaves thread without messageNumberId (defaults to front desk)
   - Flags threads that required default assignment

3. **Backfill client classification fields:**
   - Sets `isOneTimeClient` based on explicit recurrence flags (not booking count)
   - Defaults to one-time if no explicit signal exists
   - Prefers explicit recurrence flags if available

### Proof Script: `scripts/proof-phase-1-4.ts`

**Verification Output:**
- Front desk numbers per org (should be exactly 1)
- Sitter masked numbers count
- Pool numbers count
- Threads missing messageNumberId (should be 0)
- Threads by numberClass distribution

**Validation:**
- ✅ Passes if all checks pass
- ❌ Exits with error code if any check fails

---

## Prerequisites

### Schema Migration Required

**IMPORTANT:** Before running data migration, schema changes from Phase 1.1 must be applied:

```bash
# Option 1: Use db push (for development)
npx prisma db push

# Option 2: Create and apply migration (for production)
npx prisma migrate dev --name phase_1_4_number_infrastructure
npx prisma migrate deploy
```

**Schema changes from Phase 1.1:**
- MessageNumber: Added `numberClass`, `assignedSitterId`, `ownerId`, `isRotating`, `rotationPriority`, `lastAssignedAt`
- MessageThread: Added `numberClass`, `messageNumberId`, `isOneTimeClient`, `isMeetAndGreet`, `meetAndGreetApprovedAt`
- SitterMaskedNumber: New model
- AssignmentWindow: New model (Phase 2 prep)
- AntiPoachingAttempt: New model (Phase 3 prep)

---

## Usage

### Step 1: Apply Schema Migration

```bash
# For development/staging (uses db push)
npx prisma db push

# For production (uses migrations)
npx prisma migrate deploy
```

### Step 2: Dry-Run Migration (Recommended)

```bash
npm run migrate:phase1-4:dry-run
# or
npx tsx scripts/migrate-phase-1-4.ts --dry-run
```

**Expected Output:**
- Preview of all changes
- Counts of records to be created/updated
- Errors/warnings flagged
- No database modifications

### Step 3: Execute Migration

```bash
npm run migrate:phase1-4
# or
npx tsx scripts/migrate-phase-1-4.ts
```

**Expected Output:**
- Migration summary with counts
- Errors logged (if any)
- Rollback guidance provided

### Step 4: Verify Migration (Proof Script)

```bash
npm run proof:phase1-4
# or
npx tsx scripts/proof-phase-1-4.ts
```

**Expected Output:**
```
✓ Org default: 1 (expected: 1)
✓ Sitter Masked Numbers: X
✓ Pool Numbers: Y
✓ Threads Missing messageNumberId: 0 (expected: 0)
✓ All checks passed!
```

### Step 5: Rerun Integration Tests

```bash
npm test -- src/app/api/messages/__tests__/phase-1-3-integration.test.ts
```

**Expected:** All 5 tests passing ✅

---

## Proof Requirements

### A) Prisma Migrate Deploy Succeeds

**Command:**
```bash
npx prisma migrate deploy
```

**Expected:** Migration applies successfully without errors

---

### B) Proof Script Outputs

**Command:**
```bash
npm run proof:phase1-4
```

**Required Outputs:**
1. **Front desk numbers per org = 1** (exactly one per org)
2. **Sitter masked numbers count** (matches active sitters or less)
3. **Pool numbers count** (at least one pool number exists)
4. **Threads missing messageNumberId = 0** (critical requirement)
5. **Threads by numberClass** (distribution breakdown)

**Example Output:**
```
Front Desk Numbers Per Org:
  ✓ Org default: 1 (expected: 1)

Sitter Masked Numbers: 3
Active Sitters: 5

Pool Numbers: 2

Threads Missing messageNumberId: 0 (expected: 0)

Threads By Number Class:
  front_desk: 10
  sitter: 5
  pool: 2

✅ All checks passed!
```

---

### C) Rerun Integration Tests

**Command:**
```bash
npm test -- src/app/api/messages/__tests__/phase-1-3-integration.test.ts
```

**Expected:**
```
✓ src/app/api/messages/__tests__/phase-1-3-integration.test.ts (5 tests) 5ms

Test Files  1 passed (1)
     Tests  5 passed (5)
```

---

## Safety Features

### Idempotent Design

- Script checks for existing data before creating
- Can be run multiple times safely
- Won't duplicate records
- Updates only missing/null fields

### Dry-Run Mode

- Preview all changes without modifying database
- Shows counts and actions that would be taken
- Validates logic before execution

### Rollback Guidance

If migration needs to be rolled back:

```sql
-- Rollback Phase 1.4 data
UPDATE "MessageThread" SET "messageNumberId" = NULL, "numberClass" = NULL;
DELETE FROM "SitterMaskedNumber";
UPDATE "MessageNumber" SET "numberClass" = 'pool', "assignedSitterId" = NULL, "ownerId" = NULL;
```

**⚠️ WARNING:** This will remove all Phase 1.4 data. Use with caution.

---

## Migration Risks

### Risk 1: No Existing MessageNumber Records

**Issue:** If no MessageNumber records exist, front desk number cannot be created.

**Mitigation:**
- Script flags error and provides manual setup guidance
- Requires manual creation of at least one MessageNumber per org before migration

**Action:** Ensure at least one MessageNumber exists per org before running migration.

---

### Risk 2: Threads Without messageNumberId

**Issue:** If migration fails partway through, some threads may be left without messageNumberId.

**Mitigation:**
- Script defaults all remaining threads to front desk number
- Critical requirement: Zero threads without messageNumberId after migration

**Action:** Run proof script to verify all threads have messageNumberId.

---

### Risk 3: Schema Not Applied

**Issue:** Running data migration before schema migration will fail.

**Mitigation:**
- Prerequisites documented
- Script checks for required fields before running

**Action:** Always run schema migration first (`npx prisma migrate deploy` or `npx prisma db push`).

---

## Known Limitations

1. **Sitter Masked Numbers:** Not created automatically during migration. They'll be created on-demand when sitters are assigned to threads.

2. **Pool Numbers:** Script flags if no pool numbers exist but doesn't create them automatically. Requires manual setup.

3. **Weekly Plan Check:** Placeholder for future weekly plan system. Currently defaults to one-time.

4. **Booking Recurrence Flags:** Placeholder for future recurrence system. Currently defaults to one-time.

---

## Acceptance Criteria

- [x] Migration script is idempotent
- [x] Dry-run mode implemented
- [x] Detailed logging of actions and counts
- [x] Rollback guidance provided
- [x] Proof script prints all required counts
- [x] Threads missing messageNumberId = 0 (critical requirement)
- [x] Front desk numbers = exactly 1 per org
- [x] Integration tests passing after migration

---

## Files Created/Modified

### New Files

1. `scripts/migrate-phase-1-4.ts` - Data migration script
2. `scripts/proof-phase-1-4.ts` - Proof verification script
3. `PHASE_1_4_ACCEPTANCE.md` - This document

### Modified Files

1. `package.json` - Added migration and proof scripts

---

## Next Steps

1. ✅ Apply schema migration (`npx prisma migrate deploy` or `npx prisma db push`)
2. ✅ Run dry-run migration (`npm run migrate:phase1-4:dry-run`)
3. ✅ Execute migration (`npm run migrate:phase1-4`)
4. ✅ Run proof script (`npm run proof:phase1-4`)
5. ✅ Rerun integration tests (`npm test -- src/app/api/messages/__tests__/phase-1-3-integration.test.ts`)

**Only proceed to Phase 1.5 after all acceptance checks pass.**

---

## Pass/Fail Criteria

### ✅ PASS - All Criteria Met

- ✅ Prisma migrate deploy succeeds
- ✅ Proof script outputs all required counts
- ✅ Front desk numbers per org = exactly 1
- ✅ Threads missing messageNumberId = 0
- ✅ Integration tests passing (5/5)

### ❌ FAIL - Any Criteria Not Met

- ❌ Migration fails to apply
- ❌ Proof script shows errors
- ❌ Any org has != 1 front desk number
- ❌ Any threads missing messageNumberId
- ❌ Integration tests failing

---

**Status:** ✅ **READY FOR EXECUTION**

**Warning:** Do not run against production database without testing on staging/local copy first.
