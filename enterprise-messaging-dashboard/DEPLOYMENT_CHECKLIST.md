# Deployment Checklist

Use this checklist to ensure successful deployment to Render.

## Pre-Deployment

- [ ] All code committed and pushed to `main` branch
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Seed data script ready

## Render Blueprint Setup

- [ ] Created Blueprint (not manual services)
- [ ] Selected `enterprise-messaging-dashboard/render.yaml`
- [ ] Connected GitHub repository: `blackhawk123440/snout-os`
- [ ] All 4 services created:
  - [ ] `snoutos-messaging-db` (PostgreSQL)
  - [ ] `snoutos-messaging-redis` (Redis)
  - [ ] `snoutos-messaging-api` (API Server)
  - [ ] `snoutos-messaging-web` (Web Dashboard)

## Service Configuration Verification

### API Service (`snoutos-messaging-api`)

- [ ] Root Directory: `enterprise-messaging-dashboard`
- [ ] Build Command: `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
- [ ] Start Command: `pnpm --filter @snoutos/api start`
- [ ] Environment Variables:
  - [ ] `DATABASE_URL` (auto-set from database service)
  - [ ] `REDIS_URL` (auto-set from Redis service)
  - [ ] `PROVIDER_MODE=twilio`
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_WEBHOOK_AUTH_TOKEN`
  - [ ] `JWT_SECRET` (auto-generated)
  - [ ] `PORT=3001`
  - [ ] `CORS_ORIGINS` (set to web service URL)
  - [ ] `NODE_ENV=production`

### Web Service (`snoutos-messaging-web`)

- [ ] Root Directory: `enterprise-messaging-dashboard`
- [ ] Build Command: `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/web build`
- [ ] Start Command: `pnpm --filter @snoutos/web start`
- [ ] Environment Variables:
  - [ ] `NEXT_PUBLIC_API_URL` (auto-set from API service)
  - [ ] `NEXTAUTH_SECRET` (auto-generated)
  - [ ] `NEXTAUTH_URL` (auto-set from web service URL)
  - [ ] `NODE_ENV=production`

## Build Verification

- [ ] API service build succeeds (check logs)
- [ ] Web service build succeeds (check logs)
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] Shared package builds successfully

## Database Setup

- [ ] Database service is running
- [ ] API service can connect to database
- [ ] Migrations applied:
  ```bash
  cd apps/api
  pnpm prisma migrate deploy
  ```
- [ ] Seed data loaded:
  ```bash
  pnpm db:seed
  ```

## Service Health Checks

- [ ] API health endpoint responds:
  - URL: `https://snoutos-messaging-api.onrender.com/api/ops/health`
  - Status: 200 OK
- [ ] Web service is accessible:
  - URL: `https://snoutos-messaging-web.onrender.com`
  - Status: 200 OK
- [ ] API and Web services are linked correctly

## Twilio Configuration

- [ ] Twilio credentials added to API service
- [ ] Webhook URLs configured in Twilio console:
  - Inbound SMS: `https://snoutos-messaging-api.onrender.com/webhooks/twilio/inbound-sms`
  - Status Callback: `https://snoutos-messaging-api.onrender.com/webhooks/twilio/status-callback`
- [ ] Webhook signature verification working

## Post-Deployment Testing

- [ ] Can access web dashboard
- [ ] Can login with seeded credentials (`owner@example.com` / `password123`)
- [ ] Setup wizard accessible
- [ ] API endpoints respond correctly
- [ ] Database queries work
- [ ] Redis connection works
- [ ] Webhook endpoints accessible

## Troubleshooting

If build fails:
1. Check Root Directory is `enterprise-messaging-dashboard`
2. Verify pnpm is available (Render auto-detects)
3. Check build logs for specific errors
4. Ensure all environment variables are set

If services can't connect:
1. Verify service URLs are correct
2. Check CORS_ORIGINS includes web service URL
3. Verify database and Redis services are running
4. Check environment variables are set correctly

See `RENDER_SETUP.md` for detailed troubleshooting.
