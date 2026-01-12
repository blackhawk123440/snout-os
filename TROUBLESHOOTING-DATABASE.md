# Database Connection Troubleshooting

## Error: "Authentication failed against database server"

This means your `DATABASE_URL` environment variable is either:
1. Not set
2. Has invalid credentials
3. Points to the wrong database

## Solution Steps

### 1. Check if .env.local exists

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
ls -la .env.local
```

If it doesn't exist, create it:

```bash
cp .env.example .env.local
```

### 2. Set DATABASE_URL in .env.local

Open `.env.local` and add your database connection string:

```bash
# For Supabase (most common)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# For local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/snout_os"

# For other providers
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### 3. Get Supabase Connection String

If you're using Supabase:

1. Go to your Supabase project dashboard
2. Click "Settings" → "Database"
3. Scroll to "Connection string"
4. Select "URI" tab
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your actual database password

Example format:
```
postgresql://postgres.ktmarxugcepkgwgsgifx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### 4. Verify Connection

Test the connection:

```bash
# Try running a simple Prisma command
npm run db:studio
```

If that works, try the backfill again:

```bash
npm run backfill:tiers
```

## Common Issues

### Issue: "Could not read .env.local"
**Solution:** Make sure you're in the project directory:
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
```

### Issue: "Invalid credentials"
**Solution:** 
- Double-check your password in the DATABASE_URL
- Make sure there are no extra spaces or quotes
- For Supabase, use the connection pooler URL (port 6543) or direct connection (port 5432)

### Issue: "Connection timeout"
**Solution:**
- Check if your IP is allowed in Supabase (Settings → Database → Connection Pooling)
- Try using the connection pooler URL instead of direct connection
- Check your firewall/network settings

## Quick Test

Run this to test your database connection:

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run db:studio
```

If Prisma Studio opens, your connection is working!

## Still Having Issues?

1. **Check your .env.local file exists and has DATABASE_URL**
2. **Verify the connection string format is correct**
3. **Test with Prisma Studio first** (`npm run db:studio`)
4. **Check Supabase dashboard** for connection issues or IP restrictions
