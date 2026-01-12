# Deployment Checklist - Tier System

## ✅ Pre-Deployment Checks

### 1. TypeScript Compilation
- ✅ **PASSED** - `npm run typecheck` completed with no errors

### 2. Build Test
- ✅ **PASSED** - `npm run build` completed successfully
- All routes compiled correctly
- No build-time errors

### 3. Prisma Schema Validation
- ✅ **PASSED** - `npx prisma validate` confirmed schema is valid

### 4. Code Quality
- ⚠️ **WARNING** - ESLint has configuration warnings (not blocking)
- These are Next.js linting deprecation warnings, not code issues

## 🔧 Required Deployment Steps

### Step 1: Database Migration
**CRITICAL** - Must run before deployment:

```bash
npm run db:push
```

This will add the new tier fields to your database:
- `SitterTier` model fields (canJoinPools, canAutoAssign, etc.)
- `SitterTierHistory` audit fields (changedBy, reason, metadata)
- Commission split fields

### Step 2: Seed Tiers
**REQUIRED** - Create the 4 canonical tiers:

```bash
npm run db:seed
```

This creates:
- Trainee (default tier)
- Certified
- Trusted
- Elite

### Step 3: Backfill Existing Sitters
**REQUIRED** - Assign tiers to existing sitters:

```bash
npm run backfill:tiers
```

This will:
- Assign "Trainee" tier to all sitters without tiers
- Update commission percentages
- Create audit logs

### Step 4: Verify Deployment
After deployment, verify:

```bash
npm run verify:backfill
```

## 📋 Environment Variables

No new environment variables required. Existing `DATABASE_URL` is sufficient.

## 🚨 Potential Issues & Solutions

### Issue 1: Database Migration Fails
**Solution:** 
- Check database connection
- Ensure you have migration permissions
- Run `npx prisma migrate dev` instead of `db:push` if using migrations

### Issue 2: Seed Fails
**Solution:**
- Check if tiers already exist (seed is idempotent)
- Verify database connection
- Check for constraint violations

### Issue 3: Backfill Fails
**Solution:**
- Ensure tiers are seeded first
- Check DATABASE_URL is correct
- Verify sitters table exists

### Issue 4: TypeScript Errors in Production
**Solution:**
- Already fixed - PageHeader title type issue resolved
- Build completed successfully

### Issue 5: Missing Dependencies
**Solution:**
- `dotenv` added to package.json
- Run `npm install` before deployment

## ✅ Files Changed (All Committed)

### New Files:
- `src/lib/tier-permissions.ts` - Permission engine
- `src/app/api/sitters/[id]/tier/route.ts` - Tier change API
- `scripts/backfill-sitter-tiers.ts` - Backfill script
- `scripts/verify-tier-backfill.ts` - Verification script
- `scripts/audit-tier-badges.ts` - Audit script
- `docs/tier-*.md` - Documentation

### Modified Files:
- `prisma/schema.prisma` - Added tier fields
- `prisma/seed.ts` - Added tier seeding
- `src/components/sitter/SitterTierBadge.tsx` - Canonical colors
- `src/components/sitter/SitterAssignmentDisplay.tsx` - Uses SitterTierBadge
- `src/app/sitter/page.tsx` - Tier dashboard
- `src/app/api/bookings/[id]/route.ts` - Permission checks
- `src/lib/tier-rules.ts` - Uses permission engine
- `package.json` - Added scripts and dotenv

## 🎯 Deployment Order

1. **Deploy code** (git push)
2. **Run database migration** (`npm run db:push`)
3. **Seed tiers** (`npm run db:seed`)
4. **Backfill sitters** (`npm run backfill:tiers`)
5. **Verify** (`npm run verify:backfill`)

## ✨ All Clear for Deployment

- ✅ TypeScript compiles
- ✅ Build succeeds
- ✅ Schema validates
- ✅ No blocking errors
- ✅ All dependencies included

**Ready to deploy!**
