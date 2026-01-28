# Setup Guide

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

Wait for Postgres and Redis to be healthy:
```bash
docker-compose ps
```

### 3. Setup Database

```bash
cd apps/api

# Create migration
pnpm db:migrate

# Seed database
pnpm db:seed
```

### 4. Configure Environment

Create `apps/api/.env`:
```env
DATABASE_URL="postgresql://snoutos:snoutos_dev_password@localhost:5432/snoutos_messaging?schema=public"
REDIS_URL="redis://localhost:6379"
PROVIDER_MODE="mock"
NEXTAUTH_SECRET="dev-secret-change-in-production"
PORT=3001
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Start Development

From root directory:
```bash
pnpm dev
```

This starts both API (port 3001) and Web (port 3000).

### 6. Access Application

1. Open http://localhost:3000
2. You'll be redirected to `/setup`
3. Complete the setup wizard
4. Login with:
   - Email: `owner@example.com`
   - Password: `password123`

## Using Mock Provider

In `PROVIDER_MODE=mock`, you can:
- Buy numbers (simulated)
- Send messages (simulated)
- Receive webhooks (simulated)

No Twilio credentials needed for development.

## Using Real Twilio

1. Set `PROVIDER_MODE=twilio` in `apps/api/.env`
2. Add Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID="AC..."
   TWILIO_AUTH_TOKEN="..."
   TWILIO_WEBHOOK_AUTH_TOKEN="..."
   ```
3. Restart API server
4. Complete setup wizard with real credentials

## Troubleshooting

### Database Connection Failed

```bash
# Check if Postgres is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
cd apps/api && pnpm db:migrate && pnpm db:seed
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :6379

# Kill process or change ports in docker-compose.yml
```

### Module Not Found Errors

```bash
# Rebuild shared package
cd packages/shared
pnpm build

# Reinstall dependencies
cd ../..
pnpm install
```
