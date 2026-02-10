# 🚨 URGENT: Fix Web Service Build Command

## Current Problem

**Build Status:** ❌ `build_failed`

**Current Build Command (WRONG):**
```
prisma generate --schema=enterprise-messaging-dashboard/apps/api/prisma/schema.prisma && next build
```

**Error:** `prisma: command not found` - dependencies not installed before running prisma

## Fix Required

**Update Build Command to:**
```
npm install && npm run build
```

## Steps to Fix (Manual - Render Dashboard)

1. **Go to:** https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/settings

2. **Find "Build Command" field**

3. **Replace with:**
   ```
   npm install && npm run build
   ```

4. **Click "Save Changes"** - this triggers a new deployment

5. **Monitor deployment** in the Logs tab

## Why This Works

- `npm install` installs all dependencies including Prisma CLI
- `npm run build` runs the script from `package.json` which correctly uses local Prisma
- The build script in `package.json` already includes the Prisma generate command

## Verification

After deployment, check:
```bash
curl -I https://snout-os-staging.onrender.com
```

Should return HTTP 200 or 307 (redirect).

---

**Service ID:** `srv-d5abmh3uibrs73boq1kg`  
**Service Name:** `snout-os-staging`  
**URL:** https://snout-os-staging.onrender.com
