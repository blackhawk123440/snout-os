# Deployment Guide

This document outlines how to deploy the Enterprise Messaging Dashboard to production.

## Architecture

The application consists of:
- **API Server** (NestJS) - Backend API on port 3001
- **Web Dashboard** (Next.js) - Frontend on port 3000
- **PostgreSQL** - Database
- **Redis** - BullMQ queue backend

## Quick Deploy to Render (Recommended)

**One-click deployment using `render.yaml`:**

1. **Push to GitHub** (already done ✅)
2. **Go to Render Dashboard**: https://dashboard.render.com
3. **Click "New" → "Blueprint"**
4. **Connect your GitHub repository**: `blackhawk123440/snout-os`
5. **Select the `render.yaml` file** in `enterprise-messaging-dashboard/` directory
6. **Click "Apply"**

Render will automatically:
- ✅ Create PostgreSQL database
- ✅ Create Redis instance
- ✅ Deploy API server
- ✅ Deploy Web dashboard
- ✅ Set up environment variables (you'll add Twilio credentials)
- ✅ Enable auto-deploy on push to main

**After deployment, add these environment variables in Render:**
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_WEBHOOK_AUTH_TOKEN` - For webhook verification
- `CORS_ORIGINS` - Your frontend URL (auto-set by Render)

**Initialize database:**
1. Go to API service → Shell
2. Run: `cd enterprise-messaging-dashboard/apps/api && pnpm prisma migrate deploy && pnpm db:seed`

## Deployment Options

### Option 1: Render (Full Stack - Recommended)

**Recommended for:**
- Quick setup
- Automatic deployments from GitHub
- Free tier available

**Steps:**

1. **Deploy API to Render/Railway:**
   - Create new service
   - Connect GitHub repository
   - Build command: `cd apps/api && pnpm install && pnpm build`
   - Start command: `cd apps/api && pnpm start`
   - Environment variables:
     - `DATABASE_URL` - PostgreSQL connection string
     - `REDIS_URL` - Redis connection string
     - `JWT_SECRET` - Random secret for JWT
     - `PROVIDER_MODE` - `twilio` for production
     - `TWILIO_ACCOUNT_SID` - Twilio credentials
     - `TWILIO_AUTH_TOKEN` - Twilio credentials
     - `TWILIO_WEBHOOK_AUTH_TOKEN` - For webhook verification
     - `PORT` - `3001`
     - `CORS_ORIGINS` - Your frontend URL

2. **Deploy Web to Vercel:**
   - Import GitHub repository
   - Root directory: `apps/web`
   - Build command: `pnpm install && pnpm build`
   - Environment variables:
     - `NEXT_PUBLIC_API_URL` - Your API URL (from Render/Railway)
     - `NEXTAUTH_SECRET` - Random secret
     - `NEXTAUTH_URL` - Your Vercel deployment URL

3. **Run Migrations:**
   ```bash
   cd apps/api
   pnpm prisma migrate deploy
   ```

4. **Seed Initial Data (optional):**
   ```bash
   cd apps/api
   pnpm db:seed
   ```

### Option 2: Docker Compose (Self-Hosted)

**Recommended for:**
- Full control
- VPS or dedicated server
- Single-server deployment

**Steps:**

1. **Clone repository:**
   ```bash
   git clone https://github.com/blackhawk123440/snout-os.git
   cd snout-os/enterprise-messaging-dashboard
   ```

2. **Configure environment:**
   - Copy `.env.example` files (create if needed)
   - Set all required environment variables

3. **Start infrastructure:**
   ```bash
   docker-compose up -d
   ```

4. **Run migrations:**
   ```bash
   cd apps/api
   pnpm install
   pnpm prisma migrate deploy
   pnpm db:seed
   ```

5. **Start services:**
   ```bash
   # API
   cd apps/api
   pnpm start
   
   # Web (in another terminal)
   cd apps/web
   pnpm start
   ```

6. **Set up reverse proxy (nginx/traefik):**
   - Route `/api/*` to API server (port 3001)
   - Route `/*` to Web server (port 3000)

### Option 3: Kubernetes

**Recommended for:**
- Production at scale
- High availability
- Multiple environments

**Steps:**

1. Create Kubernetes manifests for:
   - PostgreSQL (StatefulSet)
   - Redis (StatefulSet)
   - API (Deployment + Service)
   - Web (Deployment + Service)
   - Ingress (for routing)

2. Apply migrations via init container or job

3. Configure secrets and config maps

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied (`prisma migrate deploy`)
- [ ] Performance indexes migration applied
- [ ] Twilio credentials configured
- [ ] Webhook URLs configured in Twilio console
- [ ] CORS origins configured
- [ ] Rate limiting thresholds reviewed
- [ ] Health checks endpoint accessible
- [ ] SSL/TLS certificates configured
- [ ] Monitoring/logging configured

## Post-Deployment Verification

1. **Check API health:**
   ```bash
   curl https://your-api-url.com/api/ops/health
   ```

2. **Verify webhook URLs in Twilio:**
   - Inbound SMS: `https://your-api-url.com/webhooks/twilio/inbound-sms`
   - Status callback: `https://your-api-url.com/webhooks/twilio/status-callback`

3. **Test login:**
   - Navigate to web dashboard
   - Login with seeded credentials
   - Complete setup wizard

4. **Run smoke test:**
   ```bash
   pnpm pilot:smoke
   ```

## Environment Variables Reference

### API Server (`apps/api/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Redis
REDIS_URL="redis://host:6379"

# Provider
PROVIDER_MODE="twilio"
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_WEBHOOK_AUTH_TOKEN="your_webhook_auth_token"

# JWT
JWT_SECRET="strong_random_secret_here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS
CORS_ORIGINS="https://your-frontend-url.com"
```

### Web Dashboard (`apps/web/.env.production`)

```env
NEXT_PUBLIC_API_URL="https://your-api-url.com"
NEXTAUTH_SECRET="strong_random_secret_here"
NEXTAUTH_URL="https://your-frontend-url.com"
```

## Troubleshooting Deployment

### API won't start
- Check DATABASE_URL is correct
- Verify Redis is accessible
- Check logs for errors

### Webhook verification fails
- Verify TWILIO_WEBHOOK_AUTH_TOKEN matches Twilio console
- Ensure webhook URLs use HTTPS
- Check CORS configuration

### Database connection errors
- Verify DATABASE_URL format
- Check firewall rules
- Ensure database is accessible from deployment platform

### Migrations fail
- Ensure DATABASE_URL has correct permissions
- Check migration files are present
- Verify Prisma client is generated

See `TROUBLESHOOTING.md` for more details.
