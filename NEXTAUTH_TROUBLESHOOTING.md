# NextAuth 500 Error Troubleshooting

## The Error
```
GET /api/auth/session 500 (Internal Server Error)
"There was a problem with the server configuration"
```

## Root Causes

### 1. NEXTAUTH_SECRET Not Set
**Symptom:** Error on every `/api/auth/session` request

**Fix:**
1. Go to Render Dashboard → Your Service → Environment
2. Add: `NEXTAUTH_SECRET=KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I=`
3. **IMPORTANT:** After adding, you MUST manually trigger a redeploy:
   - Go to Render Dashboard → Your Service
   - Click "Manual Deploy" → "Deploy latest commit"
   - OR wait for auto-deploy (can take a few minutes)

### 2. Environment Variable Not Read at Runtime
**Symptom:** Variable is set in Render but still getting errors

**Possible causes:**
- Variable added but service not redeployed
- Typo in variable name (must be exactly `NEXTAUTH_SECRET`)
- Variable set in wrong service (check you're editing the web service, not API)

**Fix:**
1. Verify variable is set: Check Render → Environment tab
2. **Manually trigger redeploy** (don't wait for auto-deploy)
3. Check build logs for: `[NextAuth] WARNING: NEXTAUTH_SECRET not set`
4. If warning appears, variable isn't being read

### 3. Database Connection Issue in Session Callback
**Symptom:** Error only when trying to get session (not on initial load)

**Fix:**
- The code now has error handling, but check:
  - `DATABASE_URL` is set correctly
  - Database is accessible from Render
  - User table exists in database

## Diagnostic Steps

### Step 1: Check Configuration Endpoint
Visit: `https://snout-os-staging.onrender.com/api/auth/config-check`

This shows:
- ✅ Which env vars are set
- ❌ Which are missing
- Exact values needed

### Step 2: Check Render Logs
1. Go to Render Dashboard → Your Service
2. Click "Logs" tab
3. Look for:
   - `[NextAuth] WARNING: NEXTAUTH_SECRET not set` - means variable not read
   - Database connection errors - means DATABASE_URL issue
   - Any other error messages

### Step 3: Verify Variable is Actually Set
1. In Render Dashboard → Environment tab
2. Look for `NEXTAUTH_SECRET` in the list
3. Click "Edit" to verify the value
4. Make sure there are no extra spaces or quotes

## Common Mistakes

❌ **Wrong:** Setting variable but not redeploying
✅ **Right:** Set variable → Save → Wait for redeploy OR manually trigger

❌ **Wrong:** Variable name with typo (`NEXTAUTH_SECRETS` instead of `NEXTAUTH_SECRET`)
✅ **Right:** Exact name: `NEXTAUTH_SECRET`

❌ **Wrong:** Setting in API service instead of Web service
✅ **Right:** Set in the Web service (Next.js app)

❌ **Wrong:** Value has quotes: `"KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I="`
✅ **Right:** No quotes: `KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I=`

## Quick Fix Checklist

- [ ] `NEXTAUTH_SECRET` is in Render Environment tab
- [ ] Value has no quotes or extra spaces
- [ ] Variable is in the **Web service** (not API service)
- [ ] Service has been **redeployed** after adding variable
- [ ] Checked `/api/auth/config-check` endpoint
- [ ] Checked Render logs for errors

## Still Not Working?

1. **Check the diagnostic endpoint:** `/api/auth/config-check`
2. **Check Render logs** for specific error messages
3. **Try manually redeploying** (don't wait for auto-deploy)
4. **Verify DATABASE_URL** is also set correctly
5. **Check if User table exists** in the database
