# Render Environment Variables Setup

## Required Environment Variables for Deployment

### Database Connection
```bash
DATABASE_URL=postgresql://user:password@host:port/database?pgbouncer=true
```

**For Supabase PostgreSQL:**
- Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Or with connection pooling: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true`

### Messaging Feature Flags (Optional - defaults to false)
```bash
ENABLE_MESSAGING_V1=false
ENABLE_PROACTIVE_THREAD_CREATION=false
ENABLE_SITTER_MESSAGES_V1=false
```

### Twilio Configuration (Required if ENABLE_MESSAGING_V1=true)
```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PROXY_SERVICE_SID=KS...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WEBHOOK_URL=https://snout-os-staging.onrender.com/api/messages/webhook/twilio
WEBHOOK_BASE_URL=https://snout-os-staging.onrender.com
```

### NextAuth Configuration (REQUIRED)
```bash
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I=
```

**⚠️ CRITICAL:** Without `NEXTAUTH_SECRET`, the login page will show 500 errors. This must be set in Render's Environment tab.

### Other Required Variables
Check your `.env.example` file for the complete list.

## How to Set Environment Variables in Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your service: `snout-os-staging`
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable from the list above
6. Click **Save Changes**
7. Render will automatically trigger a new deployment

## Critical: DATABASE_URL Format

The `DATABASE_URL` **must** start with:
- `postgresql://` or
- `postgres://`

**Common mistakes:**
- ❌ Missing protocol: `user:password@host/db`
- ❌ Wrong protocol: `mysql://...` or `mongodb://...`
- ✅ Correct: `postgresql://user:password@host:port/database`

## Build Command

The build command should be:
```bash
npm install && npx prisma generate --schema=prisma/schema.prisma && npm run build
```

**Note:** Remove `npx prisma db push` from the build command - that should only be run manually, not during build.

## Verification

After setting environment variables, check the build logs:
1. Look for: `✔ Generated Prisma Client`
2. Look for: `✓ Compiled successfully`
3. If you see `P1012` error, `DATABASE_URL` is missing or invalid
