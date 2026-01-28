# ⚠️ IMPORTANT: Render Deployment Instructions

## The Problem

If you see build errors like:
```
Type error: Cannot find module 'bcrypt' or its corresponding type declarations.
./enterprise-messaging-dashboard/apps/api/prisma/seed.ts:2:25
```

This means **Render is using the root `package.json` build command** instead of the `render.yaml` blueprint configuration.

## The Solution

**You MUST use Render's Blueprint feature**, not manual service creation.

### Step 1: Delete Existing Services (if created manually)

If you already created services manually:
1. Go to Render dashboard
2. Delete the incorrectly configured services
3. Start fresh with Blueprint

### Step 2: Create Blueprint (Correct Way)

1. **Go to**: https://dashboard.render.com
2. **Click**: "New +" → **"Blueprint"** (NOT "Web Service")
3. **Connect GitHub**: Select `blackhawk123440/snout-os`
4. **Select Blueprint File**: `enterprise-messaging-dashboard/render.yaml`
5. **Click**: "Apply"

### Step 3: Verify Configuration

After Blueprint creates services, verify each service:

**API Service (`snoutos-messaging-api`):**
- ✅ Root Directory: `enterprise-messaging-dashboard`
- ✅ Build Command: `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
- ✅ Start Command: `pnpm --filter @snoutos/api start`

**Web Service (`snoutos-messaging-web`):**
- ✅ Root Directory: `enterprise-messaging-dashboard`
- ✅ Build Command: `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/web build`
- ✅ Start Command: `pnpm --filter @snoutos/web start`

### Step 4: If Services Are Wrong

If services show the wrong build commands (like `npm install && npm run build`):

1. **Go to service** → **Settings**
2. **Update Root Directory** to: `enterprise-messaging-dashboard`
3. **Update Build Command** to the correct command (see above)
4. **Update Start Command** to the correct command (see above)
5. **Save Changes** (triggers redeploy)

## Why This Happens

Render's Blueprint feature automatically:
- Sets the correct `rootDir`
- Uses the correct build commands from `render.yaml`
- Links services together properly

Manual service creation:
- Uses root directory by default
- Uses root `package.json` build commands
- Doesn't understand the monorepo structure

## Still Having Issues?

1. **Check Root Directory**: Must be `enterprise-messaging-dashboard`
2. **Check Build Command**: Must use `pnpm --filter`, not `npm`
3. **Check pnpm is available**: Render auto-detects pnpm from `pnpm-lock.yaml`
4. **Delete and recreate**: If all else fails, delete services and use Blueprint

See `RENDER_SETUP.md` for detailed troubleshooting.
