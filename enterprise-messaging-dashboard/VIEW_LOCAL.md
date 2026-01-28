# 👀 View Changes Locally

Quick guide to see the login page, messages/inbox, and dashboard locally.

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd enterprise-messaging-dashboard
pnpm install
```

If you don't have `pnpm`:
```bash
npm install -g pnpm
```

### Step 2: Start Infrastructure

You need Docker running. Then:

```bash
# Start Postgres and Redis
docker-compose up -d

# Or if you have Docker Desktop, just make sure it's running
```

### Step 3: Setup Database & Start Servers

```bash
# Setup database (one time)
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed

# Start both servers (from root directory)
cd ../..
pnpm dev
```

This starts:
- **API**: http://localhost:3001
- **Web**: http://localhost:3000

## Access Pages

### 🏠 Home/Setup Page
**URL**: http://localhost:3000

Redirects to setup wizard if not configured, or dashboard if configured.

### 🔐 Login/Authentication
The app uses authentication via API. To login:

1. Go to http://localhost:3000
2. If not logged in, you'll be redirected to setup or can access:
   - **Setup Wizard**: http://localhost:3000/setup
   - **Dashboard** (requires auth): http://localhost:3000/dashboard

**Demo Credentials** (from seed data):
- Email: `owner@example.com`
- Password: `password123`

### 💬 Messages/Inbox Page
**URL**: http://localhost:3000/inbox

Features you'll see:
- Thread list with filters
- Message view with delivery status
- Compose box (thread-bound)
- Routing explanation drawer
- Policy violation handling
- Retry failed deliveries

### 📊 Dashboard
**URL**: http://localhost:3000/dashboard

Main dashboard with overview metrics.

### Other Pages

- **Numbers**: http://localhost:3000/numbers
- **Routing**: http://localhost:3000/routing
- **Assignments**: http://localhost:3000/assignments
- **Automations**: http://localhost:3000/automations
- **Alerts**: http://localhost:3000/alerts
- **Audit**: http://localhost:3000/audit
- **Settings**: http://localhost:3000/settings

## If You Don't Have Docker

You can use an external database:

1. Get a PostgreSQL database URL (e.g., from Supabase, Render, etc.)
2. Create `apps/api/.env`:
   ```env
   DATABASE_URL="your-postgres-url"
   REDIS_URL="redis://localhost:6379"  # Or use Upstash Redis
   JWT_SECRET="dev-secret"
   PROVIDER_MODE="mock"
   PORT=3001
   CORS_ORIGINS="http://localhost:3000"
   ```

3. Create `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   NEXTAUTH_SECRET="dev-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

## Troubleshooting

### "pnpm: command not found"
```bash
npm install -g pnpm
```

### "docker-compose: command not found"
- Install Docker Desktop: https://www.docker.com/products/docker-desktop
- Or use `docker compose` (newer version, no hyphen)

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill the process or change ports in .env files
```

### Database Connection Error
```bash
# Check if Postgres is running
docker ps

# View logs
docker-compose logs postgres
```

### "Cannot find module" errors
```bash
# Rebuild shared package
cd packages/shared
pnpm build

# Reinstall
cd ../..
pnpm install
```

## View Code

The main pages are located at:

- **Inbox**: `apps/web/src/app/inbox/page.tsx`
- **Dashboard**: `apps/web/src/app/dashboard/page.tsx`
- **Setup**: `apps/web/src/app/setup/page.tsx`
- **Layout**: `apps/web/src/app/layout.tsx`

## Next Steps

1. Start the servers: `pnpm dev`
2. Open http://localhost:3000
3. Complete setup wizard (or use mock mode)
4. Login with `owner@example.com` / `password123`
5. Explore the inbox, dashboard, and other pages!
