# 🔧 Fix CORS Error

## Problem

You're seeing this error:
```
Access to fetch at 'https://snoutos-messaging-api.onrender.com/api/auth/login' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

## Solution

The web app is trying to connect to the **Render API** instead of your **local API**.

### Fix: Update Web Environment

Make sure `apps/web/.env.local` points to your local API:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### Restart Web Server

After updating `.env.local`, restart the web server:

```bash
# Stop the web server (Ctrl+C in the terminal running it)
# Or kill it:
pkill -f "next dev"

# Then restart:
cd enterprise-messaging-dashboard/apps/web
pnpm dev
```

Or restart both servers:
```bash
cd enterprise-messaging-dashboard
pnpm dev
```

## Verify It's Working

1. **Check API is running**: http://localhost:3001/api/ops/health
2. **Check Web is using local API**: Look at browser network tab - requests should go to `localhost:3001`, not `snoutos-messaging-api.onrender.com`
3. **Try login again**: http://localhost:3000/login

## If Still Not Working

### Check API CORS Configuration

Make sure `apps/api/.env` has:
```env
CORS_ORIGINS="http://localhost:3000"
```

### Check API is Actually Running

```bash
# Check if API is running
curl http://localhost:3001/api/ops/health

# Check API logs
cd enterprise-messaging-dashboard/apps/api
# Look at the terminal where you ran `pnpm dev`
```

### Verify Environment Variables

```bash
# Check web env
cd enterprise-messaging-dashboard/apps/web
cat .env.local

# Should show:
# NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## Quick Fix Command

```bash
cd enterprise-messaging-dashboard/apps/web
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="dev-secret"
NEXTAUTH_URL="http://localhost:3000"
EOF

# Restart web server
pkill -f "next dev"
cd ../..
pnpm dev
```
