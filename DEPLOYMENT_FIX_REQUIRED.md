# Web Service Deployment Fix Required

## Current Status

✅ **Service is responding** - https://snout-os-staging.onrender.com is live
✅ **API health endpoint working**
❌ **Build command is incorrect** - needs to be updated

## Issue Found

**Current Build Command (WRONG):**
```
npm install && npm run build
```

**Required Build Command (CORRECT):**
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

**Why:** The web service needs to generate the Prisma client from the API's schema to match the database structure. Without this, Prisma queries will fail.

---

## Fix Steps

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click on **`snout-os-staging`** service

2. **Update Build Command:**
   - Go to **Settings** tab
   - Find **Build Command** field
   - Replace with:
     ```
     prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
     ```

3. **Verify Other Settings:**
   - **Start Command:** Should be `next start` ✅
   - **Root Directory:** Should be `.` (empty/root) ✅

4. **Save Changes:**
   - Click **Save Changes** button
   - This will trigger a new deployment

5. **Wait for Deployment:**
   - Monitor the **Logs** tab
   - Wait for build to complete (usually 3-5 minutes)
   - Verify deployment succeeds

---

## Verification After Fix

After the deployment completes, verify:

```bash
# Check service is responding
curl -I https://snout-os-staging.onrender.com

# Check API health
curl https://snout-os-staging.onrender.com/api/auth/health

# Run full verification
cd "/Users/leahhudson/Desktop/final form/snout-os"
python3 verify-env-vars.py
```

**Expected Results:**
- ✅ Service responds with HTTP 200 or 307
- ✅ API health returns `{"status":"ok",...}`
- ✅ All environment variables verified

---

## Why This Matters

Without the correct build command:
- Prisma client won't be generated from the correct schema
- Database queries may fail
- Login functionality may not work
- Type errors may occur during build

With the correct build command:
- Prisma client matches the API's database schema
- All database queries work correctly
- Login and authentication function properly
- Build completes successfully

---

## Quick Reference

**Service:** snout-os-staging
**URL:** https://snout-os-staging.onrender.com
**Root Directory:** `.` (repo root)
**Build Command:** `prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build`
**Start Command:** `next start`
