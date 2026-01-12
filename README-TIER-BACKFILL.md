# Tier Backfill Quick Start

## Important: Run commands from project directory

All commands must be run from the `snout-os` directory:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
```

## Step-by-Step Instructions

### 1. Navigate to project directory
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
```

### 2. Run tier badge audit (should pass)
```bash
npm run audit:tier-badges
```

Expected output:
```
✅ No violations found! All tier displays use SitterTierBadge component.
```

### 3. Run tier backfill
```bash
npm run backfill:tiers
```

This will:
- Find all sitters without a tier
- Assign them the default "Trainee" tier
- Update their commission percentage
- Create audit logs

### 4. Verify backfill results
```bash
npm run verify:backfill
```

This will show:
- How many sitters have tiers
- Tier distribution
- Backfill history records
- Event logs
- Commission verification

## Alternative: Using Prisma Studio

If you prefer a GUI to verify:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run db:studio
```

Then run these queries in Prisma Studio:

1. **Check sitters without tier:**
   ```prisma
   Sitter.findMany({
     where: { currentTierId: null }
   })
   ```

2. **Check tier history:**
   ```prisma
   SitterTierHistory.findMany({
     where: { reason: { contains: "backfill" } }
   })
   ```

3. **Check event logs:**
   ```prisma
   EventLog.findMany({
     where: { 
       eventType: "sitter.tier.changed",
       metadata: { contains: "backfill" }
     }
   })
   ```

## Troubleshooting

### "Could not read package.json"
**Problem:** You're not in the project directory.

**Solution:**
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
```

### "No default tier found"
**Problem:** Tiers haven't been seeded yet.

**Solution:**
```bash
npm run db:seed
```

### "psql: command not found"
**Problem:** PostgreSQL client not installed.

**Solution:** Use the TypeScript verification script instead:
```bash
npm run verify:backfill
```

## Full Command Sequence

```bash
# 1. Navigate to project
cd "/Users/leahhudson/Desktop/final form/snout-os"

# 2. Audit tier badges
npm run audit:tier-badges

# 3. Run backfill
npm run backfill:tiers

# 4. Verify results
npm run verify:backfill
```
