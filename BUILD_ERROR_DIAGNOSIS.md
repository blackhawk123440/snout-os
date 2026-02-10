# Build Error Diagnosis

## Problem Identified

The build command in Render is using `prisma` directly:
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

**Issue:** `prisma` is not available in PATH during build. It needs to be run via `npx` or `pnpm`.

## Root Cause

The build command assumes `prisma` CLI is globally installed or in PATH, but in Render's build environment, it's only available through the package manager.

## Solution

Update the build command in Render Dashboard to use `npx prisma`:

### Current (WRONG):
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

### Fixed (CORRECT):
```
npx prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

**OR** if using pnpm (check package-lock files):
```
pnpm prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

## Alternative: Use npm run build

Since `package.json` already has the correct build script:
```json
"build": "prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build"
```

You can simplify the Render build command to:
```
npm install && npm run build
```

This will:
1. Install dependencies (including Prisma)
2. Run the build script which uses the locally installed Prisma

## Recommended Fix

**Option 1 (Simplest):**
```
npm install && npm run build
```

**Option 2 (Explicit):**
```
npm install && npx prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

## Steps to Fix

1. Go to Render Dashboard → `snout-os-staging` service
2. Settings tab → Build Command
3. Update to: `npm install && npm run build`
4. Save Changes (triggers redeploy)

## Why This Works

- `npm install` installs all dependencies including `prisma` CLI
- `npm run build` runs the script from `package.json` which uses the locally installed Prisma
- No need for global Prisma installation
- Works consistently across environments
