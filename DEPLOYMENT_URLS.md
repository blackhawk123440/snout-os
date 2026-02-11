# Deployment URLs and Database Configuration

## Current Configuration

### Database URL
**Location**: `.env.local`

```
DATABASE_URL="postgresql://postgres.ktmarxugcepkgwgsgifx:9GaX3HSdp6JK7Rh7@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**Database Provider**: Supabase (PostgreSQL)
**Host**: `aws-0-us-west-2.pooler.supabase.com:6543`
**Database**: `postgres`
**Connection**: Using PgBouncer pooler

### Local Development URLs (ngrok)

**Current ngrok URL** (from `.env.local`):
```
WEBHOOK_BASE_URL=https://mitsue-unblundering-cooper.ngrok-free.dev
PUBLIC_BASE_URL=https://mitsue-unblundering-cooper.ngrok-free.dev
TWILIO_WEBHOOK_URL=https://mitsue-unblundering-cooper.ngrok-free.dev/api/messages/webhook/twilio
```

**Note**: This is a temporary ngrok URL for local development. It changes each time you restart ngrok.

### Production/Staging Deployment URL

**Status**: Not yet deployed

If deploying to Render, your URL will be:
```
https://<your-service-name>.onrender.com
```

Example:
```
https://snout-os.onrender.com
```

## For Staging Deployment

You need to:

1. **Deploy to Render** (or your hosting platform)
2. **Get the deployment URL** (e.g., `https://snout-os-staging.onrender.com`)
3. **Update environment variables** in Render dashboard:
   ```
   DATABASE_URL=<same-as-above-or-staging-db>
   WEBHOOK_BASE_URL=https://snout-os-staging.onrender.com
   PUBLIC_BASE_URL=https://snout-os-staging.onrender.com
   TWILIO_WEBHOOK_URL=https://snout-os-staging.onrender.com/api/messages/webhook/twilio
   ```

## For Production Deployment

Same as staging, but use production database URL and production service URL.

## Quick Check

To see your current database connection:
```bash
npx prisma db push --skip-generate
```

If it says "already in sync", your database URL is working.
`        ````````    