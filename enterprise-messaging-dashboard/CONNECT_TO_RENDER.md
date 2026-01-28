# 🔗 Connect Local Dev to Render Services

This guide shows you how to use your **Render database and Redis** from your local development environment, so you're working with the same data as production.

## ⚠️ Important Notes

- **You'll be working with production/staging data** - be careful!
- **Don't run migrations that could break production** - only run `prisma generate` locally
- **Use a separate branch** for testing if you're making schema changes
- **Redis connection** - Render Redis may have connection limits, but should work fine for local dev

## Step 1: Get Your Render Connection Strings

### Get Database URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **PostgreSQL service** (`snoutos-messaging-db`)
3. Go to the **"Info"** tab
4. Find **"Internal Database URL"** or **"Connection String"**
5. Copy the full connection string (looks like: `postgresql://snoutos:password@host:5432/snoutos_messaging`)

**Alternative**: If you see "External Connection String", you can use that too, but Internal is usually faster.

### Get Redis URL

1. In Render Dashboard, click on your **Redis service** (`snoutos-messaging-redis`)
2. Go to the **"Info"** tab
3. Find **"Internal Redis URL"** or **"Connection String"**
4. Copy the full connection string (looks like: `redis://:password@host:6379`)

**Note**: Render Redis may require SSL. The connection string might look like:
```
rediss://:password@host:6379
```
(The `rediss://` with double 's' means SSL)

## Step 2: Get Your API URL

1. In Render Dashboard, click on your **API service** (`snoutos-messaging-api`)
2. Go to the **"Info"** tab
3. Copy the **URL** (looks like: `https://snoutos-messaging-api.onrender.com`)

## Step 3: Configure Local Environment

### Create `apps/api/.env`

Create or update `enterprise-messaging-dashboard/apps/api/.env`:

```env
# Render Database (replace with your actual connection string)
DATABASE_URL="postgresql://snoutos:YOUR_PASSWORD@YOUR_HOST:5432/snoutos_messaging?schema=public&sslmode=require"

# Render Redis (replace with your actual connection string)
REDIS_URL="rediss://:YOUR_PASSWORD@YOUR_REDIS_HOST:6379"

# Use real Twilio (or keep "mock" for testing)
PROVIDER_MODE="twilio"

# Twilio Credentials (get from Render environment variables or Twilio console)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_WEBHOOK_AUTH_TOKEN="your-webhook-token"

# JWT Secret (use the same as Render, or generate a new one)
JWT_SECRET="your-jwt-secret-here"

# CORS - allow localhost
CORS_ORIGINS="http://localhost:3000"

# Port
PORT=3001

# Node Environment
NODE_ENV="development"
```

### Create `apps/web/.env.local`

Create or update `enterprise-messaging-dashboard/apps/web/.env.local`:

```env
# Point to your Render API (or use localhost:3001 if running API locally)
NEXT_PUBLIC_API_URL="https://snoutos-messaging-api.onrender.com"

# Or if you want to use local API:
# NEXT_PUBLIC_API_URL="http://localhost:3001"

# Auth secrets (use the same as Render)
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Step 4: Generate Prisma Client

You need to generate the Prisma client to connect to the database:

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm prisma generate
```

**⚠️ DO NOT run `prisma migrate dev`** - this could create migrations that affect production. Only generate the client.

## Step 5: Test Connection

### Test Database Connection

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm prisma db pull
```

This will verify you can connect to the database. If it works, you'll see the schema.

### Test Redis Connection

Start your API server and check the logs:

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm dev
```

Look for any Redis connection errors. If you see errors about SSL, you may need to adjust the Redis URL format.

## Step 6: Start Development Servers

### Option A: Use Render API + Local Web

If you want to use the **deployed API on Render** and only run the web locally:

```bash
# Only start web
cd enterprise-messaging-dashboard/apps/web
pnpm dev
```

Make sure `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` points to your Render API URL.

### Option B: Run Both Locally (Connected to Render DB/Redis)

If you want to run **both API and Web locally** but use Render's database:

```bash
# From root directory
cd enterprise-messaging-dashboard
pnpm dev
```

This starts:
- **API**: http://localhost:3001 (connected to Render DB/Redis)
- **Web**: http://localhost:3000

## Step 7: Access Your App

1. Open http://localhost:3000
2. You should see your **actual production data** from Render!
3. Login with your production credentials

## Troubleshooting

### "SSL connection required"

If you get SSL errors with the database:

1. Add `?sslmode=require` to your `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://...?sslmode=require"
   ```

2. Or try `?sslmode=prefer` if `require` doesn't work.

### "Redis connection failed"

**For Render Redis with SSL:**

1. Make sure your Redis URL uses `rediss://` (double 's') not `redis://`
2. The format should be: `rediss://:password@host:6379`

**If you still have issues:**

1. Check Render Redis logs in the dashboard
2. Verify the connection string is correct
3. Some Render Redis instances may have connection limits - try disconnecting other clients

### "Cannot connect to database"

1. **Check firewall**: Render databases may only allow connections from Render services
   - Solution: Use Render's **"External Connection"** string if available
   - Or: Use a VPN/tunnel if you need direct access

2. **Check credentials**: Verify the username, password, and database name match

3. **Check host**: Make sure you're using the correct host (internal vs external)

### "Module not found" errors

```bash
# Rebuild shared package
cd enterprise-messaging-dashboard/packages/shared
pnpm build

# Reinstall
cd ../..
pnpm install
```

### "Prisma Client not generated"

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm prisma generate
```

## Alternative: Use Render Environment Variables

If you want to keep your secrets in Render and reference them:

1. In Render Dashboard → Your API Service → Environment
2. Copy the values you need
3. Paste them into your local `.env` files

**Or** use a tool like `render-cli` to sync environment variables (if available).

## Security Best Practices

1. **Never commit `.env` files** - they're already in `.gitignore`
2. **Use different JWT secrets** for local vs production (optional, but safer)
3. **Be careful with production data** - don't accidentally delete or modify critical records
4. **Use a staging database** if possible, instead of production

## Quick Reference

**Files to create/update:**
- `enterprise-messaging-dashboard/apps/api/.env` - API configuration
- `enterprise-messaging-dashboard/apps/web/.env.local` - Web configuration

**Commands:**
```bash
# Generate Prisma client
cd apps/api && pnpm prisma generate

# Start both servers
cd ../.. && pnpm dev

# Or start individually
cd apps/api && pnpm dev
cd apps/web && pnpm dev
```

**URLs:**
- Local Web: http://localhost:3000
- Local API: http://localhost:3001
- Render API: https://snoutos-messaging-api.onrender.com (your actual URL)
