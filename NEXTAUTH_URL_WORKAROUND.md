# NEXTAUTH_URL Trailing Newline Workaround

## ✅ Code-Level Fix Applied

The app now **automatically trims** `NEXTAUTH_URL` to handle Render's trailing newline issue.

### What Was Fixed

1. **`src/lib/env.ts`**: Added `.trim()` to `NEXTAUTH_URL` processing
2. **`src/app/api/auth/health/route.ts`**: Added `.trim()` in health endpoint
3. **Added diagnostics**: `JWT_SECRET_PRESENT` and `DATABASE_URL_PRESENT` checks

### How It Works

Even if Render has `NEXTAUTH_URL=https://snout-os-staging.onrender.com\n`, the code will:
- Automatically trim whitespace/newlines
- Use the clean value: `https://snout-os-staging.onrender.com`

### Next Steps

1. **Push the commit** (if not already pushed):
   ```bash
   git push origin main
   ```

2. **Wait for Render to redeploy** (automatic after push)

3. **Verify it works**:
   ```bash
   curl -s https://snout-os-staging.onrender.com/api/auth/health | python3 -c "import sys, json; d=json.load(sys.stdin); print('NEXTAUTH_URL_RAW:', repr(d['env']['NEXTAUTH_URL_RAW']))"
   ```
   
   Should show: `'https://snout-os-staging.onrender.com'` (no newline)

4. **Test login**:
   - Go to: https://snout-os-staging.onrender.com/login
   - Email: `leah2maria@gmail.com`
   - Password: `Saint214!`
   - Should redirect to `/dashboard` on success

### If Login Still Fails

Check these in Render Dashboard → Environment:
- ✅ `DATABASE_URL` is set (internal URL)
- ✅ `JWT_SECRET` is set (matches API/Worker)
- ✅ `NEXTAUTH_SECRET` is set
- ✅ `NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com`

Then check the health endpoint:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | jq .env
```

Look for:
- `JWT_SECRET_PRESENT: true`
- `DATABASE_URL_PRESENT: true`
- `NEXTAUTH_URL_RAW` (should be clean, no newline)
