# Render Deployment Checklist

## Services to Create

### 1. snout-os-api (Web Service)
- **Name:** `snout-os-api`
- **Type:** Web Service
- **Root Directory:** `enterprise-messaging-dashboard`
- **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
- **Start Command:** `pnpm --filter @snoutos/api start:prod`
- **Health Check Path:** `/health`

### 2. snout-os-worker (Background Worker)
- **Name:** `snout-os-worker`
- **Type:** Background Worker
- **Root Directory:** `enterprise-messaging-dashboard`
- **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
- **Start Command:** `pnpm --filter @snoutos/api worker:prod`

## Environment Variables

### snout-os-web
```
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<your-secret-64-chars>
JWT_SECRET=<same-as-api-service>
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
```

### snout-os-api
```
NODE_ENV=production
PORT=3001
DATABASE_URL=<postgres-connection-string>
REDIS_URL=<redis-connection-string>
JWT_SECRET=<generate-64-chars>
ENCRYPTION_KEY=<generate-32-chars>
CORS_ORIGINS=https://snout-os-staging.onrender.com
PROVIDER_MODE=mock
```

### snout-os-worker
```
NODE_ENV=production
DATABASE_URL=<same-as-api>
REDIS_URL=<same-as-api>
JWT_SECRET=<same-as-api>
```

## URLs to Provide

After deployment, provide:
- `WEB_PUBLIC_URL=https://snout-os-staging.onrender.com`
- `API_PUBLIC_URL=https://snout-os-api.onrender.com`
- `WORKER_SERVICE_NAME=snout-os-worker`
- `COMMIT_SHA_DEPLOYED=<git-commit-sha>`
