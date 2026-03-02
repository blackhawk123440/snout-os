# Snout OS Deployment Guide

Single source of truth for production deployment.

## Required Services

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Primary database (Prisma) |
| **Redis** | Job queues (BullMQ), rate limiting, realtime pub/sub |
| **Object storage** (optional) | S3/R2 for report media uploads; local filesystem used when not configured |

## Required Processes

| Process | Command | Purpose |
|---------|---------|---------|
| **Web** | `npm run start` or `next start` | Next.js app server |
| **Worker** | `npm run worker` or `tsx src/worker/index.ts` | Background jobs (automations, calendar sync, reminders) |

**Important:** Both processes must run. The worker consumes jobs from Redis queues. Without the worker, automations, calendar sync, and reminders will not execute.

## Environment Variables

### Required (app will fail or degrade without these)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth session encryption (min 32 chars) |
| `NEXTAUTH_URL` | Full app URL (e.g. `https://app.example.com`) |

### Required in Production (queues/realtime enabled)

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection string (e.g. `redis://default:password@host:6379`) |

### Required when Stripe payments enabled

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (whsec_...) |

### Required when S3/R2 uploads enabled

| Variable | Description |
|----------|-------------|
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | Region (e.g. `us-east-1`) |
| `S3_ACCESS_KEY_ID` | Access key |
| `S3_SECRET_ACCESS_KEY` | Secret key |

### Optional / Feature-specific

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `JWT_SECRET` | JWT signing for API tokens |
| `OPENAI_API_KEY` | AI features (Daily Delight generation) |
| `TWILIO_*` | Messaging (SMS) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Calendar sync |
| `SENTRY_DSN` | Error tracking |
| `VERCEL_URL` / `RENDER_EXTERNAL_URL` | Platform-provided URL |

## Webhook URLs (must be publicly reachable)

| Webhook | Path | Provider |
|---------|------|----------|
| Stripe | `https://<your-domain>/api/webhooks/stripe` | Stripe Dashboard → Webhooks |
| Twilio inbound | `https://<your-domain>/api/twilio/inbound` | Twilio Console → Phone numbers |

## Health Check

**Endpoint:** `GET /api/health`

**Response (healthy):**
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "version": "abc1234"
}
```

**Degraded:** If Redis is unreachable, `redis` will be `"degraded"` and the app may run with limited functionality (in-memory fallbacks for rate limit and realtime bus).

**Unhealthy:** If DB is unreachable, `status` will be `"degraded"` or `"error"`.

Use this endpoint for load balancer health checks and monitoring.

## Startup Verification

On server boot, the app runs `verify-runtime` which:

- Validates `DATABASE_URL` and Prisma connectivity
- In production: fails fast if `REDIS_URL` is missing (queues/realtime require it)
- If Stripe is enabled: requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- If S3 is configured: requires all S3 credentials

Misconfigurations surface immediately rather than as silent broken behavior.
