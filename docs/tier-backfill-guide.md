# Sitter Tier Backfill Guide

## Overview

This guide covers the one-time backfill process to assign default tiers to existing sitters and log tier change events for audit purposes.

## Prerequisites

1. **Database schema updated** - Run migration to add tier fields:
   ```bash
   npm run db:push
   ```

2. **Tiers seeded** - Ensure canonical tiers exist:
   ```bash
   npm run db:seed
   ```

3. **Verify default tier exists** - The seed script creates "Trainee" as the default tier.

## Backfill Script

### Location
`scripts/backfill-sitter-tiers.ts`

### What It Does
1. Finds all sitters without a tier assignment (`currentTierId` is null)
2. Assigns the default tier (Trainee) to each sitter
3. Updates sitter's commission percentage to match tier commission split
4. Creates `SitterTierHistory` record for audit trail
5. Creates `EventLog` record for system-wide audit
6. Reports success/failure for each sitter

### Command to Run
```bash
npm run backfill:tiers
```

### Expected Output
```
🔄 Starting sitter tier backfill...

✅ Found default tier: Trainee (ID: <tier-id>)

📋 Found X sitter(s) without tier assignment

✅ Assigned Trainee to John Doe
✅ Assigned Trainee to Jane Smith
...

============================================================
📊 Backfill Summary
============================================================
Total sitters processed: X
✅ Successful: X
❌ Failed: 0

✅ Backfill completed!
```

## Verification

### SQL Queries

Run the verification SQL file to check backfill results:

```bash
# Using psql
psql $DATABASE_URL -f scripts/verify-tier-backfill.sql

# Or using Prisma Studio
npm run db:studio
# Then run queries from scripts/verify-tier-backfill.sql
```

### Key Verification Queries

1. **All sitters have tier assigned:**
   ```sql
   SELECT 
     COUNT(*) as total_sitters,
     COUNT(current_tier_id) as sitters_with_tier,
     COUNT(*) - COUNT(current_tier_id) as sitters_without_tier
   FROM "Sitter";
   ```
   Expected: `sitters_without_tier = 0`

2. **Tier distribution:**
   ```sql
   SELECT 
     st.name as tier_name,
     COUNT(s.id) as sitter_count
   FROM "Sitter" s
   JOIN "SitterTier" st ON s."currentTierId" = st.id
   GROUP BY st.name
   ORDER BY st."priorityLevel" DESC;
   ```

3. **Backfill history records:**
   ```sql
   SELECT COUNT(*) as backfill_records
   FROM "SitterTierHistory"
   WHERE "reason" LIKE '%backfill%';
   ```
   Expected: Matches number of sitters backfilled

4. **Event logs created:**
   ```sql
   SELECT COUNT(*) as backfill_events
   FROM "EventLog"
   WHERE "eventType" = 'sitter.tier.changed'
     AND metadata::text LIKE '%backfill%';
   ```
   Expected: Matches number of sitters backfilled

5. **Commission percentages match tier:**
   ```sql
   SELECT 
     st.name,
     st."commissionSplit",
     COUNT(*) as sitters,
     COUNT(CASE WHEN s."commissionPercentage" = st."commissionSplit" THEN 1 END) as matching
   FROM "Sitter" s
   JOIN "SitterTier" st ON s."currentTierId" = st.id
   GROUP BY st.name, st."commissionSplit";
   ```
   Expected: All `matching` counts equal `sitters` counts

## Post-Backfill Actions

1. **Verify all sitters have tiers** - Run verification SQL
2. **Check audit logs** - Verify `SitterTierHistory` and `EventLog` records
3. **Test tier permissions** - Verify tier-based restrictions work
4. **Monitor commission calculations** - Ensure tier-based commission is applied

## Troubleshooting

### Error: "No default tier found"
**Solution:** Run `npm run db:seed` to create tiers first.

### Some sitters failed to update
**Solution:** Check error messages in output. Common issues:
- Database connection problems
- Constraint violations
- Missing tier records

### Commission percentages don't match tier
**Solution:** The backfill script updates commission, but if you see mismatches:
```sql
-- Fix commission for a specific tier
UPDATE "Sitter" s
SET "commissionPercentage" = st."commissionSplit"
FROM "SitterTier" st
WHERE s."currentTierId" = st.id
  AND s."commissionPercentage" != st."commissionSplit";
```

## Rollback (If Needed)

If you need to rollback the backfill:

```sql
-- Remove tier assignments
UPDATE "Sitter"
SET "currentTierId" = NULL
WHERE "currentTierId" IN (
  SELECT id FROM "SitterTier" WHERE name = 'Trainee'
);

-- Remove backfill history (optional)
DELETE FROM "SitterTierHistory"
WHERE "reason" LIKE '%backfill%';

-- Remove backfill event logs (optional)
DELETE FROM "EventLog"
WHERE "eventType" = 'sitter.tier.changed'
  AND metadata::text LIKE '%backfill%';
```

**Note:** Only rollback if absolutely necessary. The backfill is designed to be safe and auditable.
