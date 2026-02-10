# Fix NEXTAUTH_URL - Exact Steps

## Issue Found
`NEXTAUTH_URL` has a trailing newline: `"https://snout-os-staging.onrender.com\n"`

## Fix Steps

1. Go to: https://dashboard.render.com
2. Click on service: `snout-os-staging`
3. Go to: **Environment** tab
4. Find: `NEXTAUTH_URL`
5. Click: **Edit** (pencil icon)
6. **Delete the entire value**
7. **Type exactly:** `https://snout-os-staging.onrender.com`
   - No trailing slash
   - No newline
   - No spaces
8. Click: **Save Changes**
9. Wait for redeploy (2-3 minutes)

## Verify Fix

After redeploy, run:
```bash
curl https://snout-os-staging.onrender.com/api/auth/health
```

Check the response:
```json
{
  "env": {
    "NEXTAUTH_URL_RAW": "https://snout-os-staging.onrender.com"
  }
}
```

**Must NOT have:** `\n` or trailing newline

---

## Current Status

✅ API Health: `https://snout-os-api.onrender.com/health` → 200 OK
✅ NEXT_PUBLIC_API_URL: Set correctly
❌ NEXTAUTH_URL: Has trailing newline (needs fix)

---

## Next: Verify Frontend Calls API

After NEXTAUTH_URL is fixed:

1. Open browser → `https://snout-os-staging.onrender.com/messages`
2. Open DevTools → Network tab
3. Find request: `GET /api/messages/threads`
4. Check Request URL column
5. **Must show:** `https://snout-os-api.onrender.com/api/messages/threads`
6. **Must NOT show:** `https://snout-os-staging.onrender.com/api/messages/threads`
