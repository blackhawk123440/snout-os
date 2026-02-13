# Render Deployment Diagnosis

## Current Status

✅ **Services Found:**
- `snout-os-staging` (Web Service) - ID: `srv-d5abmh3uibrs73boq1kg`
- `snout-os-api` (Web Service) - ID: `srv-d62mrjpr0fns738rirdg`
- `snout-os-worker` (Background Worker) - ID: `srv-d63jnnmr433s73dqep70`

⚠️ **Issue:** Services exist but deployments are not completing successfully.

## Diagnosis Steps

### 1. Check Build Logs

Go to each service in Render Dashboard:
- https://dashboard.render.com → Select service → "Logs" tab

**Look for:**
- Build errors (TypeScript, missing dependencies, Prisma issues)
- Environment variable errors
- Build command failures

### 2. Verify Build Commands

**snout-os-staging (Web):**
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

**snout-os-api:**
```
pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build
```

**snout-os-worker:**
```
pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build
```

### 3. Check Environment Variables

**Required for snout-os-staging:**
- `DATABASE_URL` (from PostgreSQL service)
- `NEXTAUTH_URL` (should be https://snout-os-staging.onrender.com)
- `NEXTAUTH_SECRET` (generated)
- `NEXT_PUBLIC_API_URL` (should be https://snout-os-api.onrender.com)
- `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true`

**Required for snout-os-api:**
- `DATABASE_URL` (from PostgreSQL service)
- `REDIS_URL` (from Redis service)
- `JWT_SECRET` (generated)
- `ENCRYPTION_KEY` (generated)
- `CORS_ORIGINS` (should include https://snout-os-staging.onrender.com)
- `PROVIDER_MODE=mock` (or `twilio`)

**Required for snout-os-worker:**
- `DATABASE_URL` (same as API)
- `REDIS_URL` (same as API)
- `JWT_SECRET` (same as API)

### 4. Manual Deploy Trigger

If services are not auto-deploying:

1. Go to https://dashboard.render.com
2. Select each service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Watch the build logs

### 5. Common Issues

**Build Fails:**
- Check if `pnpm` is available (might need `npm install -g pnpm`)
- Check if Prisma schema path is correct
- Check if all dependencies are in package.json

**Runtime Fails:**
- Check environment variables are set
- Check database connection (DATABASE_URL)
- Check Redis connection (REDIS_URL)
- Check CORS origins match web service URL

**Health Check Fails:**
- Web: `/api/health` should return 200
- API: `/health` should return 200

## Quick Fix Commands

### Trigger Manual Deploy via Dashboard:
1. Go to https://dashboard.render.com
2. Click on service
3. Click "Manual Deploy" → "Deploy latest commit"

### Check Service Status:
```bash
# Check web service
curl https://snout-os-staging.onrender.com/api/health

# Check API service  
curl https://snout-os-api.onrender.com/health
```

### Verify Environment Variables:
Use the script:
```bash
pnpm tsx scripts/check-render-deployment.ts
```

## Next Steps

1. **Check build logs** for each service to identify the specific error
2. **Verify environment variables** are set correctly
3. **Trigger manual deploy** if auto-deploy is not working
4. **Check service health** endpoints after deployment

## Service URLs (Expected)

- Web: https://snout-os-staging.onrender.com
- API: https://snout-os-api.onrender.com
- Worker: (no public URL, background service)
