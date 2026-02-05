# Render Service Inventory - REQUIRED OUTPUT

## Step 1: Current Render Services (Please Fill In)

**I cannot access Render Dashboard directly. Please provide this information:**

For each service in Render Dashboard for repo `blackhawk123440/snout-os`:

### Service 1: [Service Name]
- **Type:** [Web Service / Background Worker]
- **Repo:** blackhawk123440/snout-os
- **Branch:** [main / master / other]
- **Root Directory:** [e.g., . (root) or enterprise-messaging-dashboard]
- **Build Command:** [e.g., pnpm install && pnpm build]
- **Start Command:** [e.g., pnpm start]
- **Public URL:** [e.g., https://snout-os-staging.onrender.com]

### Service 2: [Service Name]
- **Type:** [Web Service / Background Worker]
- **Repo:** blackhawk123440/snout-os
- **Branch:** [main / master / other]
- **Root Directory:** [e.g., . (root) or enterprise-messaging-dashboard]
- **Build Command:** [e.g., pnpm install && pnpm build]
- **Start Command:** [e.g., pnpm start]
- **Public URL:** [e.g., https://snout-os-api.onrender.com]

### Service 3: [Service Name]
- **Type:** [Web Service / Background Worker]
- **Repo:** blackhawk123440/snout-os
- **Branch:** [main / master / other]
- **Root Directory:** [e.g., . (root) or enterprise-messaging-dashboard]
- **Build Command:** [e.g., pnpm install && pnpm build]
- **Start Command:** [e.g., pnpm start]
- **Public URL:** [if applicable]

---

## Required Services (Canonical Architecture)

### 1. snout-os-web (Next.js UI)
- **Type:** Web Service
- **Root Directory:** `.` (repo root)
- **Build Command:** `prisma generate --schema=prisma/schema.prisma && next build`
- **Start Command:** `next start`
- **Public URL:** `https://snout-os-staging.onrender.com` ✅ (confirmed)

### 2. snout-os-api (NestJS Backend)
- **Type:** Web Service
- **Root Directory:** `enterprise-messaging-dashboard`
- **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
- **Start Command:** `pnpm --filter @snoutos/api start` (or `node dist/main.js` from apps/api)
- **Public URL:** `https://snout-os-api.onrender.com` ❓ (unknown - needs to be created/verified)
- **Health Endpoint:** Must expose `GET /health` → 200

### 3. snout-os-worker (BullMQ Workers)
- **Type:** Background Worker
- **Root Directory:** `enterprise-messaging-dashboard`
- **Build Command:** `pnpm install && pnpm --filter @snoutos/shared build && pnpm --filter @snoutos/api build`
- **Start Command:** `pnpm --filter @snoutos/api worker` (or equivalent - needs verification)
- **Public URL:** N/A (background worker)
- **Required Env:** Same `DATABASE_URL` and `REDIS_URL` as API

---

## Next Steps

Once inventory is provided:
1. Verify/create `snout-os-api` service
2. Verify/create `snout-os-worker` service
3. Wire Web → API via `NEXT_PUBLIC_API_URL`
4. Remove/disable Next.js shadow API routes
5. Verify end-to-end connectivity
