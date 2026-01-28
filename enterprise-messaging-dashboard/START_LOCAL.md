# 🚀 Start Local Development

Quick guide to run the Enterprise Messaging Dashboard locally.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose (for Postgres + Redis)

## Quick Start

### 1. Start Infrastructure

```bash
cd enterprise-messaging-dashboard
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Database

```bash
# Generate Prisma client
cd apps/api
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed demo data
pnpm db:seed
```

### 4. Start Development Servers

From the `enterprise-messaging-dashboard` root:

```bash
# Start both API and Web in parallel
pnpm dev
```

Or start separately:

**Terminal 1 - API:**
```bash
cd apps/api
pnpm dev
```
API runs on: http://localhost:3001

**Terminal 2 - Web:**
```bash
cd apps/web
pnpm dev
```
Web runs on: http://localhost:3000

## Access the Application

### Login Page
- **URL**: http://localhost:3000/login
- **Demo Credentials**:
  - Email: `owner@example.com`
  - Password: `password123`

### Dashboard Pages

After logging in, you can access:

- **Dashboard**: http://localhost:3000/dashboard
- **Inbox/Messages**: http://localhost:3000/inbox
- **Numbers**: http://localhost:3000/numbers
- **Routing**: http://localhost:3000/routing
- **Assignments**: http://localhost:3000/assignments
- **Automations**: http://localhost:3000/automations
- **Alerts**: http://localhost:3000/alerts
- **Audit**: http://localhost:3000/audit
- **Settings**: http://localhost:3000/settings
- **Setup Wizard**: http://localhost:3000/setup

## Environment Variables

Create `.env` files if needed:

**`apps/api/.env`:**
```env
DATABASE_URL="postgresql://snoutos:snoutos@localhost:5432/snoutos_messaging"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-here"
PROVIDER_MODE="mock"
PORT=3001
CORS_ORIGINS="http://localhost:3000"
```

**`apps/web/.env.local`:**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :6379

# Kill process or change ports
```

### Database Connection Error

```bash
# Check Docker containers
docker-compose ps

# Restart containers
docker-compose restart

# View logs
docker-compose logs postgres
```

### Module Not Found

```bash
# Rebuild shared package
cd packages/shared
pnpm build

# Reinstall dependencies
cd ../..
pnpm install
```

### Prisma Client Not Generated

```bash
cd apps/api
pnpm prisma generate
```

## Stop Services

```bash
# Stop dev servers (Ctrl+C)

# Stop Docker containers
docker-compose down
```

## View Database

```bash
cd apps/api
pnpm db:studio
```

Opens Prisma Studio at http://localhost:5555
