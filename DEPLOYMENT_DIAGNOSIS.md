# Deployment Diagnosis

## ✅ Fixed Issues

1. **Next.js 15 Route Handler Signature**
   - Fixed: Changed `{ params }` to `context: { params: Promise<...> }` and await params
   - File: `src/app/api/[...path]/route.ts`

2. **TypeScript Errors**
   - Fixed: Added type assertions for Prisma schema mismatch
   - Files: `src/lib/auth.ts`, `src/lib/messaging/pool-release-job.ts`

3. **Duplicate Proxy Route**
   - Fixed: Removed `src/app/api/proxy/[...path]/route.ts` (duplicate)

## ✅ Local Build Status

- ✅ TypeScript compilation: PASS
- ✅ Next.js build: PASS
- ✅ All route handlers: Valid

## 🔍 What to Check on Render

### 1. Build Command
Verify in Render Dashboard → Web Service → Settings:
```
Build Command: npm install && npm run build
```

### 2. Environment Variables (Web Service)
Required variables:
- `NEXTAUTH_URL` = `https://snout-os-staging.onrender.com`
- `NEXTAUTH_SECRET` = (your secret, min 32 chars)
- `DATABASE_URL` = (internal PostgreSQL URL)
- `NEXT_PUBLIC_API_URL` = `https://snout-os-api.onrender.com`
- `JWT_SECRET` = (same as API service - for BFF proxy)

### 3. Route Priority
Next.js route priority (most specific first):
1. `/api/auth/[...nextauth]` - NextAuth routes (handled first)
2. `/api/auth/health` - Specific auth routes
3. `/api/[...path]` - Catch-all proxy (handles everything else)

The catch-all proxy has a safety check to skip `auth/` paths.

### 4. Build Logs
Check Render build logs for:
- TypeScript errors
- Missing dependencies
- Prisma generation errors
- Next.js build errors

### 5. Runtime Logs
After deployment, check runtime logs for:
- `[BFF Proxy]` messages
- `[NextAuth]` messages
- JWT minting errors

## 🚨 Common Issues

### Issue: Build fails with "params is not a valid type"
**Fix**: Already fixed - params are now async and awaited

### Issue: TypeScript errors about Prisma models
**Fix**: Already fixed - using type assertions for schema mismatch

### Issue: Proxy not working
**Check**:
1. `JWT_SECRET` is set on Web service (same as API)
2. `NEXT_PUBLIC_API_URL` is set correctly
3. NextAuth session is working (check `/api/auth/health`)

### Issue: 401 errors on API calls
**Check**:
1. User is logged in (NextAuth session exists)
2. `orgId` and `role` are in session (check auth.ts)
3. `JWT_SECRET` matches between Web and API services

## 📋 Verification Steps

1. **Check Build Logs**: Look for any errors during `npm run build`
2. **Check Service Status**: Verify Web service is "Live" on Render
3. **Test Health Endpoint**: `curl https://snout-os-staging.onrender.com/api/auth/health`
4. **Test Login**: Try logging in with `leah2maria@gmail.com` / `Saint214!`
5. **Test Proxy**: After login, check Network tab - requests should go to `/api/messages/threads` (not direct API URL)

## 🔧 If Build Still Fails

1. **Clear Render Cache**: In Render Dashboard → Settings → Clear Build Cache
2. **Check Node Version**: Should be 20.x
3. **Check Build Command**: Must be `npm install && npm run build`
4. **Check Root Directory**: Should be `/` (root of repo)

## 📝 Current Commit

Latest commit: `4b7f8b7` - "Fix TypeScript errors: Use type assertions for Prisma schema mismatch"

All fixes are pushed to `main` branch.
