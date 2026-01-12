# Quick Fix: Database Connection Error

## The Problem
Your scripts can't connect to the database because `DATABASE_URL` is either missing or has invalid credentials.

## Quick Fix (3 steps)

### Step 1: Install dotenv (if needed)
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm install dotenv
```

### Step 2: Check your .env.local file
```bash
cat .env.local | grep DATABASE_URL
```

If you see nothing or an empty value, you need to add it.

### Step 3: Add DATABASE_URL to .env.local

**Option A: If you have Supabase**
1. Go to your Supabase project dashboard
2. Settings → Database → Connection string
3. Copy the "URI" connection string
4. Add to `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres.ktmarxugcepkgwgsgifx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
   ```
   Replace `[YOUR-PASSWORD]` with your actual database password.

**Option B: If you don't have .env.local**
```bash
# Create from example
cp .env.example .env.local

# Then edit it and add your DATABASE_URL
nano .env.local
# or
open .env.local
```

## Test It

After setting DATABASE_URL, test the connection:

```bash
npm run db:studio
```

If Prisma Studio opens, you're good! Then try:

```bash
npm run backfill:tiers
```

## Still Not Working?

1. **Check the password** - Make sure there are no typos
2. **Check for quotes** - DATABASE_URL should be in quotes: `DATABASE_URL="..."`
3. **Check Supabase IP allowlist** - Settings → Database → Connection Pooling → Allowed IPs
4. **Try connection pooler URL** - Use port 6543 instead of 5432

## Need Help?

See `TROUBLESHOOTING-DATABASE.md` for more detailed help.
