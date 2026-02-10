# 🚨 URGENT: Fix Build Command

## Problem

The build is failing because the build command uses `prisma` directly:
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

**Error:** `prisma: command not found`

The `prisma` CLI is not in PATH during build. It needs to be run via `npx` or through npm scripts.

## Solution

### Option 1: Use npm run build (RECOMMENDED)

Update the build command in Render to:
```
npm install && npm run build
```

**Why this works:**
- `npm install` installs all dependencies including Prisma CLI
- `npm run build` runs the script from `package.json` which uses the locally installed Prisma from `node_modules/.bin`
- No need to specify `npx` - npm scripts automatically use local binaries

### Option 2: Use npx explicitly

If you want to keep the explicit command:
```
npm install && npx prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

## Steps to Fix

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click on `snout-os-staging` service

2. **Update Build Command:**
   - Go to **Settings** tab
   - Find **Build Command** field
   - **Replace** with:
     ```
     npm install && npm run build
     ```

3. **Save Changes:**
   - Click **Save Changes**
   - This triggers a new deployment

4. **Monitor Build:**
   - Go to **Logs** tab
   - Watch for:
     - ✅ `✔ Generated Prisma Client`
     - ✅ `✓ Compiled successfully`
     - ✅ Build completes without errors

## Why Current Command Fails

The current command:
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

Assumes `prisma` is:
- Globally installed (it's not)
- In PATH (it's not)
- Available as a command (it's only in `node_modules/.bin`)

## Verification

After updating, the build should:
1. Install dependencies ✅
2. Generate Prisma Client ✅
3. Build Next.js app ✅
4. Deploy successfully ✅

## Current vs Fixed

| Current (FAILS) | Fixed (WORKS) |
|----------------|---------------|
| `prisma generate ... && next build` | `npm install && npm run build` |
| Assumes global Prisma | Uses local Prisma from node_modules |
| Command not found error | Works correctly |

---

**Action Required:** Update build command in Render Dashboard to `npm install && npm run build`
