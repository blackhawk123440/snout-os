# ⚡ Quick Start: Connect to Render

**Fastest way to use your Render database locally.**

## 1. Get Connection Strings from Render

### Database URL
1. Render Dashboard → `snoutos-messaging-db` → **Info** tab
2. Copy **"Internal Database URL"**
3. Should look like: `postgresql://snoutos:password@host:5432/snoutos_messaging`

### Redis URL  
1. Render Dashboard → `snoutos-messaging-redis` → **Info** tab
2. Copy **"Internal Redis URL"**
3. Should look like: `rediss://:password@host:6379` (note: `rediss://` with SSL)

### API URL
1. Render Dashboard → `snoutos-messaging-api` → **Info** tab
2. Copy the **URL** (e.g., `https://snoutos-messaging-api.onrender.com`)

## 2. Create Local Config Files

### `apps/api/.env`
```env
DATABASE_URL="paste-your-render-db-url-here?sslmode=require"
REDIS_URL="paste-your-render-redis-url-here"
PROVIDER_MODE="twilio"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-token"
TWILIO_WEBHOOK_AUTH_TOKEN="your-webhook-token"
JWT_SECRET="your-secret"
CORS_ORIGINS="http://localhost:3000"
PORT=3001
```

### `apps/web/.env.local`
```env
# Use Render API
NEXT_PUBLIC_API_URL="https://snoutos-messaging-api.onrender.com"

# Or use local API (if running API locally)
# NEXT_PUBLIC_API_URL="http://localhost:3001"

NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## 3. Generate Prisma Client

```bash
cd enterprise-messaging-dashboard/apps/api
pnpm prisma generate
```

**⚠️ Don't run `prisma migrate dev`** - only generate the client!

## 4. Start Development

```bash
# From root directory
cd enterprise-messaging-dashboard
pnpm dev
```

## 5. Open Your App

- **Web**: http://localhost:3000
- **API**: http://localhost:3001 (if running locally)

You'll now see your **actual Render data**! 🎉

---

**Full guide**: See `CONNECT_TO_RENDER.md` for detailed instructions and troubleshooting.
