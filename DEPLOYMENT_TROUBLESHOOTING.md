# Deployment Troubleshooting

## Current Status

✅ **Code is pushed**: All commits are on `origin/main`
✅ **Git remote**: Connected to `https://github.com/blackhawk123440/snout-os.git`

## Why Deployment Might Not Have Triggered

### 1. Render Branch Configuration
Check in Render dashboard:
- Service: `snout-os-staging`
- Settings → Build & Deploy
- **Branch**: Should be `main` (not `master` or other)

### 2. Manual Deploy Trigger
If auto-deploy is off:
1. Go to Render dashboard
2. Click `snout-os-staging` service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### 3. Build Command Check
Verify build command in Render:
```bash
prisma generate --schema=prisma/schema.prisma && next build
```

### 4. Check Deployment Logs
In Render dashboard:
- Go to `snout-os-staging` service
- Click **"Logs"** tab
- Look for:
  - Build errors
  - Environment variable errors
  - Database connection errors

### 5. Environment Variables Not Set
If `ENABLE_MESSAGING_V1` is not set to `true`, messaging won't work.

## Quick Fix Steps

1. **Trigger Manual Deploy**:
   - Render dashboard → `snout-os-staging` → Manual Deploy

2. **Verify Environment Variables**:
   - Settings → Environment
   - Ensure `ENABLE_MESSAGING_V1=true` is set

3. **Check Build Logs**:
   - Look for any errors during build
   - Common issues: missing env vars, database connection

4. **Verify Branch**:
   - Settings → Build & Deploy
   - Branch should be `main`

## After Deploy

Verify it worked:
```bash
curl https://snout-os-staging.onrender.com/api/messages/diagnostics
```

Should return JSON (not `{"error":"Messaging V1 not enabled"}`)
