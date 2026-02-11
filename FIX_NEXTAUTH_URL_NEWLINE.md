# Fix NEXTAUTH_URL Trailing Newline

## 🚨 Problem Found

Your `NEXTAUTH_URL` has a trailing newline:
```
"NEXTAUTH_URL_RAW":"https://snout-os-staging.onrender.com\n"
```

Notice the `\n` at the end - this can cause NextAuth to fail!

## ✅ Fix Steps

### Step 1: Go to Render Dashboard
1. Navigate to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env
2. Find `NEXTAUTH_URL` in the environment variables list

### Step 2: Edit NEXTAUTH_URL
1. Click on `NEXTAUTH_URL` to edit it
2. **Delete the entire value**
3. **Type it fresh** (don't paste): `https://snout-os-staging.onrender.com`
4. Make sure there's NO trailing space or newline
5. Click "Save"

### Step 3: Verify Fix
After saving, test again:
```bash
curl https://snout-os-staging.onrender.com/api/auth/health | jq .env.NEXTAUTH_URL_RAW
```

Should show: `"https://snout-os-staging.onrender.com"` (no `\n`)

### Step 4: Redeploy
After fixing, Render should auto-redeploy. If not:
1. Go to: Render Dashboard → `snout-os-staging` → Manual Deploy
2. Click "Deploy latest commit"

## Why This Matters

The trailing newline (`\n`) can cause:
- NextAuth cookie domain issues
- Callback URL mismatches
- Session creation failures
- Build/runtime errors

## Other Variables to Check

While you're there, verify these don't have trailing newlines:
- `NEXT_PUBLIC_API_URL` (should be: `https://snout-os-api.onrender.com`)
- `NEXT_PUBLIC_BASE_URL` (should be: `https://snout-os-staging.onrender.com`)
- `JWT_SECRET` (should have no trailing newline)

## Quick Test After Fix

```bash
# Should return clean URL without \n
curl -s https://snout-os-staging.onrender.com/api/auth/health | grep -o '"NEXTAUTH_URL_RAW":"[^"]*"'
```

Expected: `"NEXTAUTH_URL_RAW":"https://snout-os-staging.onrender.com"`
