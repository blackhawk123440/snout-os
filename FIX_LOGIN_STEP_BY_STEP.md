# Fix Login Issue - Step by Step

## What We're Doing

We're adding comprehensive logging to see exactly where login fails. Follow these steps in order.

## Step 1: Deploy the Debug Code

The code is committed locally. **Push it to GitHub** (you may need to authenticate):
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
git push origin main
```

Or push manually through GitHub Desktop/CLI.

## Step 2: Wait for Web Service to Redeploy

After pushing, Render will automatically redeploy. Wait 2-3 minutes.

## Step 3: Check Debug Endpoint

**Test the debug endpoint** to see what's wrong:
```bash
curl https://snout-os-web.onrender.com/api/debug-auth
```

**Look for:**
- ✅ `databaseConnection: "✅ Connected"` - Database is reachable
- ✅ `userTableAccess: "✅ Found X users"` - User table exists
- ✅ `userFound: "✅ User exists"` - User exists in database
- ❌ Any errors will show exactly what's wrong

## Step 4: Check Web Service Logs

**Go to**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/logs

**Try logging in** with:
- Email: `leah2maria@gmail.com`
- Password: `Saint214!`

**Look for these log messages:**
1. `[NextAuth] Login attempt for: leah2maria@gmail.com`
2. `[NextAuth] DATABASE_URL set: true` (should be true)
3. `[NextAuth] Querying database for user...`
4. `[NextAuth] User query result: Found` or `Not found`
5. `[NextAuth] User found, checking password...`
6. `[NextAuth] Password comparison result: true` or `false`

**The logs will tell you exactly where it fails.**

## Step 5: Fix Based on Logs

### If you see: `DATABASE_URL set: false`
**Problem**: DATABASE_URL not set on Web service
**Fix**: 
1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/environment
2. Add: `DATABASE_URL=postgresql://snout_os_db_staging_user:r5oPEGtD6Cl3SvrvHpc0Q3PUAsJVUTnz@dpg-d5ab7v6r433s738a2isg-a/snout_os_db_staging`
3. Save and wait for redeploy

### If you see: `Database error during authorize: ...`
**Problem**: Database connection or schema mismatch
**Check**: The error message will tell you what's wrong
- `P1001: Can't reach database server` → DATABASE_URL wrong or database down
- `P2021: The table ... does not exist` → Schema mismatch
- `Unknown arg 'sitterId'` → Prisma schema mismatch

### If you see: `User not found in database`
**Problem**: User doesn't exist
**Fix**: Run this in **API service shell**:
```bash
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
psql $DATABASE_URL << 'EOF'
DO $$
DECLARE
  org_id TEXT;
  password_hash TEXT := '$2b$10$shlVzw6CFY87F2WZV/ieruwuNuuyG9UpQbmc8YBKHEQGnytI9GkCq';
BEGIN
  SELECT id INTO org_id FROM "Organization" LIMIT 1;
  IF org_id IS NULL THEN RAISE EXCEPTION 'No org found'; END IF;
  INSERT INTO "User" (id, "orgId", role, name, email, "passwordHash", active, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::TEXT, org_id, 'owner', 'Owner', 'leah2maria@gmail.com', password_hash, true, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET "passwordHash" = password_hash, "updatedAt" = NOW();
END $$;
EOF
```

### If you see: `Password comparison result: false`
**Problem**: Password hash doesn't match
**Fix**: Run the SQL above to update the password hash

### If you see: `Unknown arg 'sitterId' in select`
**Problem**: Prisma schema mismatch - Web service schema doesn't match API database
**Fix**: This is a bigger issue. The Web service's Prisma client was generated from a different schema than the API's database. We need to either:
1. Make Web service use API's Prisma schema, OR
2. Remove `sitterId` from the select in auth.ts

**Quick fix** (remove sitterId temporarily):
```typescript
// In src/lib/auth.ts, line 83, change:
select: { id: true, email: true, name: true, passwordHash: true, sitterId: true },
// To:
select: { id: true, email: true, name: true, passwordHash: true },
```

## Step 6: Test Login Again

After fixing the issue:
1. Wait for redeploy (if you changed env vars)
2. Try login again
3. Check logs to confirm it works

---

## Quick Reference

**Debug endpoint**: `https://snout-os-web.onrender.com/api/debug-auth`
**Web service logs**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/logs
**Web service env vars**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/environment
**API service shell**: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/shell
