# 🚨 URGENT: Fix Render Build Command

## The Problem
Render is still using the old build command with `prisma db push`, which tries to drop database columns and fails.

## Solution: Update Build Command in Render Dashboard

**Render is NOT using your `render.yaml` file** - you need to manually update the build command in the Render dashboard.

### Step-by-Step Fix:

1. **Go to Render Dashboard**
   - Open: https://dashboard.render.com
   - Find your service (likely named `snout-form` or similar)

2. **Go to Settings**
   - Click on your service
   - Click **"Settings"** tab in the left sidebar
   - Scroll down to **"Build & Deploy"** section

3. **Update Build Command**
   - Find the **"Build Command"** field
   - **DELETE** the current command:
     ```
     npm install && npx prisma db push --schema=prisma/schema.prisma --skip-generate && npx prisma generate --schema=prisma/schema.prisma && npm run build
     ```
   
   - **REPLACE** with this:
     ```
     npm install && npm run build
     ```

4. **Save Changes**
   - Click **"Save Changes"** button at the bottom
   - Render will automatically trigger a new deployment

### Why This Works:
- `npm install` runs `postinstall` script which generates Prisma client
- `npm run build` already includes `prisma generate` + `next build`
- **No database schema changes during build** (safe!)

### After Fix:
- Build should complete successfully
- No data loss warnings
- App will deploy correctly

---

## Alternative: If You Want to Use Blueprint

If you want Render to use your `render.yaml` file:

1. **Delete your existing service** in Render dashboard
2. **Create a new Blueprint**:
   - Go to: https://dashboard.render.com
   - Click **"New +"** → **"Blueprint"**
   - Connect GitHub repo: `blackhawk123440/snout-os`
   - Select blueprint file: `render.yaml`
   - Click **"Apply"**

**But the manual fix above is faster and easier!**
