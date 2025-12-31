# Render Staging Setup Guide - Phase 1 Verification

**Date**: 2024-12-30  
**Purpose**: Create staging environment for Phase 1 form mapper verification  
**Status**: ⚠️ ACTION REQUIRED

---

## Prerequisites

- [ ] Render account access
- [ ] Production web service exists on Render
- [ ] Production database "snout os db" exists on Render
- [ ] Git repository access (same repo/branch as production)

---

## Step 1: Create Staging Database on Render

### Actions Required (Manual - Render Dashboard)

1. Log into Render Dashboard: https://dashboard.render.com
2. Click **"New +"** button
3. Select **"PostgreSQL"**
4. Configure:
   - **Name**: `snout-os-db-staging` (or `snout os db staging`)
   - **Region**: Same as production database (check production DB region first)
   - **PostgreSQL Version**: Latest stable (or match production)
   - **Plan**: Free tier is fine for testing (or cheapest paid if free unavailable)
5. Click **"Create Database"**
6. Wait for database to provision (2-5 minutes)

### After Database Provisions

- [ ] Copy the **Internal Database URL** (or full DATABASE_URL)
- [ ] Format: `postgresql://user:password@hostname:port/database`
- [ ] Save this URL - you'll need it for Step 3
- [ ] Document the database name: `snout-os-db-staging`

**Note**: Use Internal Database URL if staging service is in same region, otherwise use External Database URL.

---

## Step 2: Create Staging Web Service on Render

### Actions Required (Manual - Render Dashboard)

1. In Render Dashboard, click **"New +"** button
2. Select **"Web Service"**
3. Connect Repository:
   - **Repository**: Same repository as production
   - **Branch**: Same branch as production (or staging branch if you have one)
4. Configure Service:
   - **Name**: `snout-os-staging` (or `snout os staging`)
   - **Region**: Same as production (if possible)
   - **Environment**: **Node**
   - **Build Command**: See current production build command below
   - **Start Command**: See current production start command below

### Current Build/Start Commands (from package.json)

**Build Command**:
```bash
prisma generate --schema=prisma/schema.prisma && next build
```

**Alternative Build Command** (if you need to push schema):
```bash
prisma generate --schema=prisma/schema.prisma && prisma db push --schema=prisma/schema.prisma --skip-generate && next build
```

**Start Command**:
```bash
next start
```

### Migration Strategy

**Option A: Automatic Migrations (Recommended for Staging)**

Modify build command to run migrations:
```bash
prisma generate --schema=prisma/schema.prisma && prisma migrate deploy --schema=prisma/schema.prisma && next build
```

**Option B: Separate Migration Job (If you prefer manual control)**

After staging service is created:
1. Create new Render **"Background Worker"** or **"Cron Job"**
2. Name: `snout-os-staging-migrate`
3. Command: `npx prisma migrate deploy`
4. Environment: Node
5. Connect to same repo/branch
6. Set `DATABASE_URL` env var to staging database URL
7. Run once manually or schedule

**Recommendation**: Use Option A (add migrate deploy to build command) for staging. This ensures schema is always up to date on deploy.

---

## Step 3: Set Staging Environment Variables

### Critical: Copy Production Env Vars First

**Before making changes, copy ALL production environment variables** to staging service.

### Required Environment Variables

#### Database Connection (CRITICAL - Must Use Staging DB)
- [ ] **DATABASE_URL**: Use staging database URL from Step 1
  - **DO NOT** use production database URL
  - Format: `postgresql://user:password@hostname:port/database`

#### Phase 1 Feature Flag (STAGING ONLY)
- [ ] **ENABLE_FORM_MAPPER_V1**: `true`
  - **This is the ONLY difference from production**
  - Production must remain `false`

#### Security Flags (Keep OFF for Now)
- [ ] **ENABLE_AUTH_PROTECTION**: `false`
- [ ] **ENABLE_SITTER_AUTH**: `false`
- [ ] **ENABLE_PERMISSION_CHECKS**: `false`
- [ ] **ENABLE_WEBHOOK_VALIDATION**: `false`

#### Copy from Production (Exact Values)
- [ ] **NODE_ENV**: `production` (or match production)
- [ ] **OPENPHONE_API_KEY**: Copy from production
- [ ] **OPENPHONE_NUMBER_ID**: Copy from production (if set)
- [ ] **OPENPHONE_WEBHOOK_SECRET**: Copy from production (if set)
- [ ] **STRIPE_SECRET_KEY**: Copy from production (if set)
- [ ] **STRIPE_PUBLISHABLE_KEY**: Copy from production (if set)
- [ ] **STRIPE_WEBHOOK_SECRET**: Copy from production (if set)
- [ ] **REDIS_URL**: Copy from production (or use shared Redis if applicable)
- [ ] **NEXTAUTH_URL**: Set to staging service URL (e.g., `https://snout-os-staging.onrender.com`)
- [ ] **NEXTAUTH_SECRET**: Copy from production (must be same for auth to work)
- [ ] **OWNER_PHONE**: Copy from production
- [ ] **OWNER_PERSONAL_PHONE**: Copy from production (if set)
- [ ] **OWNER_OPENPHONE_PHONE**: Copy from production (if set)
- [ ] **NEXT_PUBLIC_APP_URL**: Set to staging URL
- [ ] **NEXT_PUBLIC_BASE_URL**: Set to staging URL
- [ ] Any other production env vars

### Verification Checklist

- [ ] Staging `DATABASE_URL` points to staging database (NOT production)
- [ ] Staging `ENABLE_FORM_MAPPER_V1=true` (ONLY on staging)
- [ ] Production `ENABLE_FORM_MAPPER_V1` remains `false` (verify production settings)
- [ ] All other env vars copied from production
- [ ] `NEXTAUTH_URL` and `NEXT_PUBLIC_*` URLs point to staging service

---

## Step 4: Deploy Staging Service

1. After setting environment variables, Render will auto-deploy
2. Watch deployment logs for errors
3. Verify deployment completes successfully
4. Note staging service URL (e.g., `https://snout-os-staging.onrender.com`)

---

## Step 5: Verify Staging Health

### Health Check Endpoint

Open in browser:
```
https://your-staging-service-url.onrender.com/api/health
```

### Expected Response

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok",
    "queue": "ok",
    "workers": "ok"
  },
  "auth": {
    "configured": true,
    "flags": {
      "enableAuthProtection": false,
      "enableSitterAuth": false,
      "enablePermissionChecks": false,
      "enableWebhookValidation": false
    }
  }
}
```

### Verification Checklist

- [ ] Service responds (HTTP 200)
- [ ] `services.database` is `"ok"` (CRITICAL - if false, stop and fix)
- [ ] `services.redis` is `"ok"` (or "error" if Redis not configured - acceptable)
- [ ] `auth.flags.enableAuthProtection` is `false`
- [ ] Health endpoint shows no errors

**If database is not connected**: Stop immediately. Check `DATABASE_URL` env var, verify database is provisioned, check network access.

---

## Step 6: Run Migrations on Staging (If Not in Build)

If you chose Option B (separate migration job):

1. Run the migration job once
2. Verify migrations completed successfully
3. Check database schema matches production

If you chose Option A (migrations in build command):
- Migrations run automatically on deploy
- Verify in deployment logs that `prisma migrate deploy` succeeded

### Verify Schema Applied

You can verify schema by:
1. Checking deployment logs for migration output
2. Using Prisma Studio: `npx prisma studio` (point to staging DATABASE_URL)
3. Checking health endpoint shows database connected

---

## Step 7: Run Phase 1 5-Booking Verification

### Preparation

- [ ] Open `PHASE_1_STAGING_VERIFICATION_GUIDE.md`
- [ ] Open `PHASE_1_ACCEPTANCE_CHECKLIST.md`
- [ ] Have staging booking form URL ready

### Verification Process

For each of the 5 test bookings:

1. **Submit Booking**: Submit through staging booking form
2. **Capture Booking ID**: Note booking ID from response
3. **Verify in Dashboard**: Check booking appears in staging dashboard
4. **Verify in Database**: Query staging database for booking record
5. **Fill Checklist**: Complete checklist items for that booking
6. **Document Results**: Record any issues or confirmations

### Test Bookings (from Verification Guide)

1. **Booking 1**: Simple one pet, one time slot, short notes
2. **Booking 2**: Multiple pets, longer notes, special instructions
3. **Booking 3**: Same day booking, time near midnight
4. **Booking 4**: Multi-day or multiple time slots
5. **Booking 5**: Weird case - blank notes vs other notes fields

### Stop Conditions

**If ANY booking fails ANY checklist item**:
1. **STOP IMMEDIATELY**
2. Set `ENABLE_FORM_MAPPER_V1=false` in staging service
3. Redeploy staging service
4. Log exact failure:
   - Booking number
   - Checklist item failed
   - Expected vs actual values
   - Booking ID
   - Raw payload
5. **DO NOT PROCEED** until issue is fixed

### Success Criteria

All 5 bookings must:
- Submit successfully (HTTP 200/201)
- Appear in dashboard with correct data
- Have all fields mapped correctly
- Show correct notes precedence
- Have correct timezone handling
- Have correct quantity calculation
- Have correct pet data
- Match expected values exactly

---

## Step 8: Mark Phase 1 as VERIFIED

Only complete this step **AFTER ALL 5 BOOKINGS PASS**.

1. Open `PHASE_1_ACCEPTANCE_CHECKLIST.md`
2. Update Final Verdict:
   - Check: ✅ **VERIFIED** - All 5 bookings passed, Phase 1 verified
   - Fill in completion date
   - Fill in verified by
3. Document staging URL used for verification
4. Save checklist file

---

## Step 9: Tiny Production Rollout (After Verification Passes)

**Only proceed after Phase 1 is marked VERIFIED.**

### Production Rollout Steps

1. **Low Traffic Window**: Choose low-traffic time (e.g., late night/weekend)

2. **Enable Flag in Production**:
   - In production service settings, set `ENABLE_FORM_MAPPER_V1=true`
   - **Verify** production database URL is correct (not staging)
   - Deploy production

3. **Monitor Deployment**:
   - Watch deployment logs
   - Verify deployment succeeds
   - Check production health endpoint

4. **Test Booking 1**:
   - Submit 1 real booking through production form
   - Verify booking appears correctly
   - Check all fields mapped correctly
   - Verify notes precedence
   - Check pricing unchanged

5. **If Booking 1 Passes, Test 3 More**:
   - Submit 3 additional real bookings
   - Verify each one passes all checks
   - Monitor for any issues

6. **Rollback Plan** (One-Minute Rollback):
   - If ANY booking fails or looks wrong:
   - Set `ENABLE_FORM_MAPPER_V1=false` in production
   - Redeploy production
   - System immediately reverts to old behavior
   - Investigate issue in staging before retrying

---

## Critical Safety Rules

### DO NOT
- ❌ Change production `ENABLE_FORM_MAPPER_V1` until staging verification passes
- ❌ Use production database URL in staging service
- ❌ Enable `ENABLE_AUTH_PROTECTION` yet (Phase 1 comes first)
- ❌ Skip any verification steps
- ❌ Proceed with production rollout if staging verification fails
- ❌ Migrate to Supabase until Phase 1 is verified in production

### DO
- ✅ Verify production flag remains `false` before starting
- ✅ Use staging database URL in staging service
- ✅ Complete all 5 booking verifications
- ✅ Document all results in checklist
- ✅ Rollback immediately if anything fails
- ✅ Test in low-traffic window for production

---

## Current Build/Start Commands Reference

From `package.json`:

**Build Command** (Current):
```bash
prisma generate --schema=prisma/schema.prisma && next build
```

**Build Command** (With Migrations - Recommended for Staging):
```bash
prisma generate --schema=prisma/schema.prisma && prisma migrate deploy --schema=prisma/schema.prisma && next build
```

**Start Command** (Current):
```bash
next start
```

**Note**: If your production build command is different, use that. Check production service settings in Render dashboard to see exact commands.

---

## Environment Variables Checklist Template

Use this checklist when setting up staging:

```
STAGING ENVIRONMENT VARIABLES CHECKLIST

Database:
[ ] DATABASE_URL = [staging database URL from Step 1]

Phase 1 Flag (STAGING ONLY):
[ ] ENABLE_FORM_MAPPER_V1 = true

Security Flags (Keep OFF):
[ ] ENABLE_AUTH_PROTECTION = false
[ ] ENABLE_SITTER_AUTH = false
[ ] ENABLE_PERMISSION_CHECKS = false
[ ] ENABLE_WEBHOOK_VALIDATION = false

Copy from Production:
[ ] NODE_ENV = [copy from prod]
[ ] OPENPHONE_API_KEY = [copy from prod]
[ ] OPENPHONE_NUMBER_ID = [copy from prod]
[ ] STRIPE_SECRET_KEY = [copy from prod]
[ ] STRIPE_PUBLISHABLE_KEY = [copy from prod]
[ ] REDIS_URL = [copy from prod]
[ ] NEXTAUTH_SECRET = [copy from prod]
[ ] OWNER_PHONE = [copy from prod]
[ ] NEXT_PUBLIC_APP_URL = [staging URL]
[ ] NEXTAUTH_URL = [staging URL]
[ ] [other production vars...]

VERIFICATION:
[ ] Staging DATABASE_URL ≠ Production DATABASE_URL
[ ] Staging ENABLE_FORM_MAPPER_V1 = true
[ ] Production ENABLE_FORM_MAPPER_V1 = false (verify in prod settings)
```

---

## Troubleshooting

### Database Connection Fails
- Check `DATABASE_URL` format is correct
- Verify database is fully provisioned
- Check database and service are in same region
- Try External Database URL if Internal fails

### Build Fails
- Check Prisma schema is valid: `npx prisma validate`
- Verify all dependencies in `package.json`
- Check build logs for specific errors

### Migrations Fail
- Verify `DATABASE_URL` points to staging (not production)
- Check migration files exist in `prisma/migrations/`
- Review migration logs for specific errors

### Health Check Fails
- Verify database connection
- Check Redis connection (if used)
- Review service logs for errors

---

## Next Steps After Verification

After Phase 1 is VERIFIED and production rollout succeeds:

1. **Sprint A: Pricing Unification** (Next priority per user requirements)
2. **Gate B: Security Containment** (Enable auth protection after Phase 1)
3. **Supabase Migration** (Consider later, not now)

---

**Last Updated**: 2024-12-30  
**Status**: Ready for execution - Follow steps sequentially

