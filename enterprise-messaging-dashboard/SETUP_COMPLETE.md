# ✅ Local Setup Complete - Connected to Render

Your local development environment is now configured to use your **Render staging database**!

## What Was Set Up

### ✅ Database Connection
- **Database**: `snout_os_db_staging` on Render
- **Connection String**: Configured in `apps/api/.env`
- **Prisma Client**: Generated successfully

### ✅ Configuration Files Created

1. **`apps/api/.env`** - API configuration with your Render database
2. **`apps/web/.env.local`** - Web configuration pointing to Render API

## Next Steps

### 1. Get Your Redis URL from Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **Redis service** (`snoutos-messaging-redis` or similar)
3. Go to **Info** tab
4. Copy **"Internal Redis URL"** (should look like `rediss://:password@host:6379`)
5. Update `apps/api/.env`:
   ```env
   REDIS_URL="rediss://:your-password@your-host:6379"
   ```

### 2. Get Your API Secrets from Render

1. Go to Render Dashboard → Your **API service** → **Environment** tab
2. Copy these values to `apps/api/.env`:
   - `JWT_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WEBHOOK_AUTH_TOKEN`

3. Go to Render Dashboard → Your **Web service** → **Environment** tab
4. Copy these values to `apps/web/.env.local`:
   - `NEXTAUTH_SECRET`
   - Update `NEXT_PUBLIC_API_URL` with your actual Render API URL

### 3. Get Your Render API URL

1. Render Dashboard → **API service** → **Info** tab
2. Copy the **URL** (e.g., `https://snoutos-messaging-api.onrender.com`)
3. Update `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL="https://your-actual-api-url.onrender.com"
   ```

## Start Development

Once you've added the Redis URL and secrets:

```bash
# From root directory
cd enterprise-messaging-dashboard
pnpm dev
```

This starts:
- **API**: http://localhost:3001 (connected to Render DB/Redis)
- **Web**: http://localhost:3000

## Test Connection

To verify your database connection works:

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm prisma db pull
```

This will show your database schema if connected successfully.

## Current Configuration

### Database
- ✅ Connected to: `snout_os_db_staging` on Render
- ✅ Connection string configured
- ✅ Prisma client generated

### Still Needed
- ⏳ Redis URL (get from Render)
- ⏳ JWT_SECRET (get from Render)
- ⏳ Twilio credentials (get from Render)
- ⏳ NEXTAUTH_SECRET (get from Render)
- ⏳ API URL (get from Render)

## Important Notes

⚠️ **You're working with staging/production data** - be careful!

- Don't run `prisma migrate dev` - only use `prisma generate`
- Don't delete or modify critical production data
- Use a separate branch for testing schema changes

## Troubleshooting

### "Cannot connect to database"
- Check that your Render database allows external connections
- Verify the connection string is correct
- Make sure `?sslmode=require` is in the URL

### "Redis connection failed"
- Make sure you're using `rediss://` (double 's') for SSL
- Check the Redis URL format: `rediss://:password@host:6379`

### "Module not found"
```bash
cd enterprise-messaging-dashboard/packages/shared
pnpm build
cd ../..
pnpm install
```

## Files Created

- `apps/api/.env` - API configuration
- `apps/web/.env.local` - Web configuration
- `apps/api/prisma/schema.prisma` - Fixed schema errors

All set! Just add the missing secrets from Render and you're ready to go! 🚀
