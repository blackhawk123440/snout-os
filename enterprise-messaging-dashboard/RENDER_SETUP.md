# Render Deployment Setup

## Important: Use Blueprint Deployment

**The `render.yaml` file must be used via Render's Blueprint feature**, not by manually creating services.

### Step 1: Create Blueprint

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository: `blackhawk123440/snout-os`
4. **Select the blueprint file**: `enterprise-messaging-dashboard/render.yaml`
5. Click **"Apply"**

### Step 2: Verify Services Created

After applying the blueprint, you should see 4 services:
- `snoutos-messaging-db` (PostgreSQL)
- `snoutos-messaging-redis` (Redis)
- `snoutos-messaging-api` (API Server)
- `snoutos-messaging-web` (Web Dashboard)

### Step 3: Check Service Configuration

For each service, verify:

**API Service (`snoutos-messaging-api`):**
- Root Directory: `enterprise-messaging-dashboard/apps/api`
- Build Command: `pnpm install && pnpm build`
- Start Command: `pnpm start`

**Web Service (`snoutos-messaging-web`):**
- Root Directory: `enterprise-messaging-dashboard/apps/web`
- Build Command: `pnpm install && pnpm build`
- Start Command: `pnpm start`

### If Services Were Created Manually (Wrong Way)

If you created services manually instead of using the Blueprint:

1. **Delete the incorrectly configured services**
2. **Create a new Blueprint** using the steps above
3. **OR manually update each service:**
   - Go to service → Settings
   - Set **Root Directory** to the correct path:
     - API: `enterprise-messaging-dashboard/apps/api`
     - Web: `enterprise-messaging-dashboard/apps/web`
   - Update Build Command:
     - API: `pnpm install && pnpm build`
     - Web: `pnpm install && pnpm build`
   - Update Start Command:
     - API: `pnpm start`
     - Web: `pnpm start`

### Troubleshooting Build Errors

**Error: "Cannot find module 'bcrypt'"**
- This means the build is running from the wrong directory
- Verify Root Directory is set correctly (see above)
- The web service should NOT be building API files

**Error: "Cannot find module '@snoutos/shared'"**
- Run `pnpm install` from the monorepo root first
- Or ensure the build command includes `pnpm install`

**Error: "Prisma schema not found"**
- Verify Root Directory is set to `enterprise-messaging-dashboard/apps/api` for API service
- The Prisma schema is at `enterprise-messaging-dashboard/apps/api/prisma/schema.prisma`

### Environment Variables

After services are created, add these to the **API service**:

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WEBHOOK_AUTH_TOKEN=your_webhook_auth_token
```

The following are auto-configured by Render:
- `DATABASE_URL` (from database service)
- `REDIS_URL` (from Redis service)
- `JWT_SECRET` (auto-generated)
- `NEXT_PUBLIC_API_URL` (web service, from API service)
- `NEXTAUTH_SECRET` (web service, auto-generated)
- `NEXTAUTH_URL` (web service, from web service URL)

### Initialize Database

After first deployment:

1. Go to **API service** → **Shell** tab
2. Run:
   ```bash
   pnpm prisma migrate deploy
   pnpm db:seed
   ```

### Verify Deployment

1. **API Health**: `https://snoutos-messaging-api.onrender.com/api/ops/health`
2. **Web Dashboard**: `https://snoutos-messaging-web.onrender.com`
3. **Login**: `owner@example.com` / `password123`
