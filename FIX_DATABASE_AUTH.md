# Fix Database Authentication Error

## Problem
```
Error: P1000: Authentication failed against database server
the provided database credentials for `postgres` are not valid.
```

## Solution: Get Correct DATABASE_URL from Supabase

### Step 1: Get Your Supabase Database URL

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **Connection pooling** tab
6. Copy the **URI** (it looks like):
   ```
   postgresql://postgres.ktmarxugcepkgwgsgifx:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### Step 2: Get Your Database Password

If you don't know your password:

1. In Supabase Dashboard → **Settings** → **Database**
2. Look for **Database password** section
3. If you forgot it:
   - Click **Reset database password**
   - Copy the new password immediately
   - **Save it securely!**

### Step 3: Update DATABASE_URL in Render

1. Go to Render Dashboard: https://dashboard.render.com
2. Click your service: `snout-os-staging`
3. Go to **Environment** tab
4. Find `DATABASE_URL`
5. Click **Edit** (or delete and recreate)
6. Paste the **full connection string** from Supabase
7. **Important:** Replace `[YOUR-PASSWORD]` with your actual password
8. Click **Save Changes**

### Step 4: Fix Build Command

**CRITICAL:** The build command still has `db push` which is causing the error.

1. Go to **Settings** tab
2. Find **Build Command**
3. **Current (WRONG):**
   ```bash
   npm install && npx prisma db push --schema=prisma/schema.prisma --skip-generate && npx prisma generate --schema=prisma/schema.prisma && npm run build
   ```
4. **Change to (CORRECT):**
   ```bash
   npm install && npm run build
   ```
5. Click **Save Changes**

**Why?**
- `db push` requires valid DATABASE_URL and tries to modify schema
- We don't want to modify schema during build
- `prisma generate` already runs in `postinstall` hook
- `npm run build` already includes `prisma generate`

### Step 5: Redeploy

1. After saving both changes, Render will auto-deploy
2. Or click **Manual Deploy** → **Deploy latest commit**
3. Watch **Logs** tab
4. Should see: `✔ Generated Prisma Client` and `✓ Compiled successfully`

## Alternative: Use Direct Connection (Not Pooled)

If connection pooling doesn't work, try direct connection:

1. In Supabase → **Settings** → **Database**
2. Select **Connection string** tab (NOT pooling)
3. Copy the URI
4. Update `DATABASE_URL` in Render
5. **Note:** Direct connection uses port `5432`, not `6543`

## Verify Connection

After updating, check build logs:
- ✅ Should see: `✔ Generated Prisma Client`
- ✅ Should see: `✓ Compiled successfully`
- ❌ If still fails: Check password is correct (no extra spaces/quotes)

## Quick Checklist

- [ ] Got DATABASE_URL from Supabase (Connection pooling tab)
- [ ] Replaced `[YOUR-PASSWORD]` with actual password
- [ ] Updated `DATABASE_URL` in Render Environment
- [ ] Fixed Build Command to: `npm install && npm run build`
- [ ] Saved changes (triggers auto-deploy)
- [ ] Build succeeds in logs
