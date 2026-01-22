# Fix Render Build - DATABASE_URL Missing

## Problem
Build is failing with:
```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`.
```

## Solution: Set Environment Variables in Render

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Select your service: `snout-os-staging`
3. Click **Environment** tab

### Step 2: Add DATABASE_URL
Click **Add Environment Variable** and add:

**Key:** `DATABASE_URL`  
**Value:** Your PostgreSQL connection string

**For Supabase (from your local .env.local):**
```
postgresql://postgres.ktmarxugcepkgwgsgifx:9GaX3HSdp6JK7Rh7@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Important:** 
- Must start with `postgresql://` or `postgres://`
- Replace password if needed
- Use port `6543` for connection pooling (PgBouncer)

### Step 3: Add Other Required Variables

**NEXTAUTH_URL:**
```
https://snout-os-staging.onrender.com
```

**NEXTAUTH_SECRET:**
Generate a random string (32+ characters):
```bash
openssl rand -base64 32
```

**OPENPHONE_API_KEY:**
Your OpenPhone API key (if you have one)

### Step 4: Fix Build Command

In Render dashboard → **Settings** → **Build Command**, change from:
```bash
npm install && npx prisma db push --schema=prisma/schema.prisma --skip-generate && npx prisma generate --schema=prisma/schema.prisma && npm run build
```

To:
```bash
npm install && npm run build
```

**Why?** 
- `prisma generate` runs automatically in `postinstall` script
- `db push` should NOT run during build (only manually)
- `npm run build` already includes `prisma generate`

### Step 5: Save and Redeploy

1. Click **Save Changes**
2. Render will automatically trigger a new deployment
3. Watch the build logs - should see:
   - ✅ `✔ Generated Prisma Client`
   - ✅ `✓ Compiled successfully`

## Verification

After deployment succeeds:
1. Visit: `https://snout-os-staging.onrender.com`
2. Check logs for any runtime errors
3. Test database connection by visiting any page

## Optional: Messaging Variables (if enabling messaging)

Only add these if you're enabling `ENABLE_MESSAGING_V1=true`:

```bash
ENABLE_MESSAGING_V1=false
ENABLE_PROACTIVE_THREAD_CREATION=false
ENABLE_SITTER_MESSAGES_V1=false

TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PROXY_SERVICE_SID=KS...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WEBHOOK_URL=https://snout-os-staging.onrender.com/api/messages/webhook/twilio
WEBHOOK_BASE_URL=https://snout-os-staging.onrender.com
PUBLIC_BASE_URL=https://snout-os-staging.onrender.com
```

## Quick Checklist

- [ ] DATABASE_URL set in Render environment
- [ ] NEXTAUTH_URL set to Render service URL
- [ ] NEXTAUTH_SECRET set (random 32+ char string)
- [ ] Build command fixed (removed `db push`)
- [ ] Deployment triggered
- [ ] Build succeeds
- [ ] Service is running
