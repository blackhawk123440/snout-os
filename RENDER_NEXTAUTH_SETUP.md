# 🚨 URGENT: Set NEXTAUTH_SECRET in Render

## The Problem
The staging deployment is showing 500 errors on `/api/auth/session` because `NEXTAUTH_SECRET` is not set.

## Quick Fix (5 minutes)

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Find your service: `snout-os-staging` (or similar)

### Step 2: Add Environment Variable
1. Click on your service
2. Go to **Environment** tab (left sidebar)
3. Click **Add Environment Variable**
4. **Key:** `NEXTAUTH_SECRET`
5. **Value:** `KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I=`
6. Click **Save Changes**

### Step 3: Wait for Redeploy
- Render will automatically trigger a new deployment
- Wait 2-3 minutes for the build to complete
- The `/api/auth/session` endpoint should now work

## Also Set NEXTAUTH_URL
While you're there, also add:
- **Key:** `NEXTAUTH_URL`
- **Value:** `https://snout-os-staging.onrender.com` (or your actual Render URL)

## Verify It Works
After deployment completes:
1. Go to: `https://snout-os-staging.onrender.com/login`
2. Try to log in
3. Should redirect to `/dashboard` without errors

## For Local Development
Add to `.env.local`:
```bash
NEXTAUTH_SECRET=KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I=
NEXTAUTH_URL=http://localhost:3000
```

## Security Note
⚠️ **For production**, generate a new secret:
```bash
openssl rand -base64 32
```

The value above is fine for staging/testing, but use a unique secret for production.
