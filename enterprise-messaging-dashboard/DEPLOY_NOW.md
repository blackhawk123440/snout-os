# 🚀 Deploy Now - Quick Guide

## Automatic Deployment to Render

Your repository is configured for automatic deployment. Follow these steps:

### Step 1: Connect to Render (One-Time Setup)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Sign in** with GitHub (if not already)
3. **Click "New +" → "Blueprint"**
4. **Connect Repository**: Select `blackhawk123440/snout-os`
5. **Select Blueprint File**: Choose `enterprise-messaging-dashboard/render.yaml`
6. **Click "Apply"**

Render will automatically create:
- ✅ PostgreSQL database (`snoutos-messaging-db`)
- ✅ Redis instance (`snoutos-messaging-redis`)
- ✅ API server (`snoutos-messaging-api`)
- ✅ Web dashboard (`snoutos-messaging-web`)

### Step 2: Add Twilio Credentials

After services are created, add environment variables:

1. **Go to API service** (`snoutos-messaging-api`)
2. **Click "Environment" tab**
3. **Add these variables:**
   ```
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_WEBHOOK_AUTH_TOKEN=your_webhook_auth_token_here
   ```
4. **Click "Save Changes"** (triggers redeploy)

### Step 3: Initialize Database

1. **Go to API service** → **"Shell" tab**
2. **Run:**
   ```bash
   cd apps/api
   pnpm prisma migrate deploy
   pnpm db:seed
   ```

### Step 4: Configure Webhooks in Twilio

1. **Get your API URL** from Render dashboard (e.g., `https://snoutos-messaging-api.onrender.com`)
2. **Go to Twilio Console** → **Phone Numbers** → **Your Number**
3. **Set webhook URLs:**
   - **A message comes in**: `https://snoutos-messaging-api.onrender.com/webhooks/twilio/inbound-sms`
   - **Status callback URL**: `https://snoutos-messaging-api.onrender.com/webhooks/twilio/status-callback`

### Step 5: Verify Deployment

1. **Check API health**: `https://snoutos-messaging-api.onrender.com/api/ops/health`
2. **Access web dashboard**: `https://snoutos-messaging-web.onrender.com`
3. **Login**: `owner@example.com` / `password123`

## Auto-Deploy on Push

Once connected, **every push to `main` automatically deploys** to Render.

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify `rootDir: enterprise-messaging-dashboard` is set
- Ensure `pnpm` is available (Render auto-detects)

### Database Connection Fails
- Verify `DATABASE_URL` is auto-set by Render
- Check database service is running
- Verify migrations ran successfully

### Web Can't Connect to API
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify API service is running
- Check CORS configuration

See `TROUBLESHOOTING.md` for more help.
