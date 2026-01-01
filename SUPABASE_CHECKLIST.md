# Supabase Connection Checklist

## Usually Nothing Needed

If your connection string is correct, you typically don't need to change anything in Supabase.

## If Connection Still Fails, Check These:

### 1. Database is Running
- Go to Supabase Dashboard → Your Project
- Check that the database status shows "Active"

### 2. Connection String is Correct
- Go to Supabase Dashboard → Settings → Database
- Check "Connection string" section
- Make sure you're using the correct connection string format
- For direct connection, use the one under "Connection pooling" → "Direct connection" or "Session mode"

### 3. IP Allowlist (Usually Not Required)
- Go to Settings → Database → Connection Pooling
- Check if there are IP restrictions
- For development (localhost), usually no restrictions needed
- If you see IP allowlist, you might need to add your IP (but this is rare)

### 4. Password is Correct
- If you recently changed the database password, update it in the connection string
- Check Settings → Database → Database password

### 5. Network/Firewall
- Make sure your internet connection is working
- Some corporate networks block database connections

## Most Common Issue

The most common issue is using the wrong connection string format. Make sure you're using:
- **Direct connection**: `postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres`
- **Pooled connection**: `postgresql://postgres.PROJECT-REF:PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true`

## Quick Test

Try connecting from Supabase's SQL Editor first:
- Go to Supabase Dashboard → SQL Editor
- Run a simple query: `SELECT 1;`
- If this works, your database is accessible and the connection string should work too

## What You Don't Need to Do

- ✅ No need to enable connection pooling (already enabled)
- ✅ No need to change database settings
- ✅ No need to add IP addresses (usually)
- ✅ No need to create new databases

---

**Most likely:** Your connection string should work as-is. If `npx prisma db push` fails, the issue is usually:
1. Network connectivity
2. Wrong password in connection string
3. Database is paused/inactive (check dashboard)

