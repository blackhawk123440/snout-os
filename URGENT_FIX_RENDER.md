# 🚨 URGENT: Fix Render Build Command

## The Problem

Your build command in Render **STILL** has `db push` which is causing the error.

**Current (WRONG):**
```
npm install && npx prisma db push --schema=prisma/schema.prisma --skip-generate && npx prisma generate --schema=prisma/schema.prisma && npm run build
```

**Must Change To:**
```
npm install && npm run build
```

## Step-by-Step Fix (Do This NOW)

### Step 1: Open Render Dashboard
1. Go to: https://dashboard.render.com
2. Click your service: `snout-os-staging` (or whatever it's named)

### Step 2: Fix Build Command
1. Click **Settings** tab (left sidebar)
2. Scroll down to **Build & Deploy** section
3. Find **Build Command** field
4. **DELETE** everything in that field
5. **TYPE** exactly this:
   ```
   npm install && npm run build
   ```
6. **DO NOT** include `db push` or `prisma db push` anywhere
7. Click **Save Changes** button (bottom of page)

### Step 3: Get Correct DATABASE_URL from Supabase

**Option A: If you know your password**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Click **Connection pooling** tab
6. Copy the **URI** - it looks like:
   ```
   postgresql://postgres.ktmarxugcepkgwgsgifx:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
7. Replace `[YOUR-PASSWORD]` with your actual password

**Option B: If you don't know your password**
1. Go to Supabase Dashboard → Your Project
2. Go to **Settings** → **Database**
3. Find **Database password** section
4. Click **Reset database password**
5. **Copy the new password immediately** (you won't see it again!)
6. Then follow Option A above with the new password

### Step 4: Update DATABASE_URL in Render
1. In Render Dashboard → Your Service
2. Click **Environment** tab (left sidebar)
3. Find `DATABASE_URL` in the list
4. Click **Edit** (or delete and add new)
5. **Paste** the full connection string from Supabase
6. **Make sure** the password is correct (no `[YOUR-PASSWORD]` placeholder)
7. **Make sure** it starts with `postgresql://`
8. Click **Save Changes**

### Step 5: Verify Both Changes
Before deploying, verify:
- [ ] **Build Command** = `npm install && npm run build` (NO `db push`)
- [ ] **DATABASE_URL** = Full connection string with real password

### Step 6: Deploy
1. After saving both changes, Render will auto-deploy
2. OR click **Manual Deploy** → **Deploy latest commit**
3. Watch **Logs** tab
4. Should see: `✔ Generated Prisma Client` and `✓ Compiled successfully`

## Why This Fixes It

1. **Removing `db push`** - We don't need to modify the database during build. The schema is already in sync.
2. **Using `npm run build`** - This already includes `prisma generate` (runs in `postinstall` hook)
3. **Correct DATABASE_URL** - Prisma needs valid credentials to generate the client (even though we're not connecting during build, it validates the URL)

## If Still Failing

Check the **Logs** tab and look for:
- ❌ `P1000: Authentication failed` → DATABASE_URL password is wrong
- ❌ `db push` in logs → Build command wasn't saved correctly
- ❌ `Cannot find module` → Build didn't complete

## Quick Test

After deployment succeeds:
1. Visit: `https://snout-os-staging.onrender.com`
2. Should see your app (not error page)
3. Check **Logs** → **Runtime** tab for any errors
