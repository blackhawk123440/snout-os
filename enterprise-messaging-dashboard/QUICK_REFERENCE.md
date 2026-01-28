# Quick Reference

## 🚀 Start Everything

```bash
# From root directory
docker-compose up -d    # Start Postgres + Redis
cd apps/api
pnpm db:migrate         # Create database
pnpm db:seed            # Seed demo data
cd ../..
pnpm dev                # Start API + Web
```

## 🔑 Default Credentials

- **Email**: `owner@example.com`
- **Password**: `password123`

## 📍 Key URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555 (run `pnpm db:studio` in `apps/api`)

## 🧪 Test Routing

```bash
POST http://localhost:3001/api/routing/simulate
Authorization: Bearer <token>
{
  "threadId": "<thread-id>",
  "timestamp": "2026-01-19T14:30:00Z"
}
```

## 📡 Simulate Inbound Webhook (Mock Mode)

```bash
POST http://localhost:3001/webhooks/twilio/inbound-sms
Content-Type: application/x-www-form-urlencoded

MessageSid=mock-123&From=%2B15551234567&To=%2B15551111111&Body=Hello
```

## 🔍 View Audit Events

```bash
GET http://localhost:3001/api/audit/events?limit=100
Authorization: Bearer <token>
```

## 📊 Database Commands

```bash
cd apps/api

# Create migration
pnpm db:migrate

# Reset database
pnpm db:migrate reset

# View database
pnpm db:studio

# Seed data
pnpm db:seed
```

## 🛠️ Development Commands

```bash
# From root
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm typecheck        # Type check all packages

# API only
cd apps/api
pnpm dev              # Start API only
pnpm test             # Run API tests

# Web only
cd apps/web
pnpm dev              # Start web only
pnpm test:e2e         # Run E2E tests
```

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3000 | xargs kill
lsof -ti:3001 | xargs kill
```

### Database Connection Failed
```bash
# Restart Postgres
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Module Not Found
```bash
# Rebuild shared package
cd packages/shared && pnpm build && cd ../..
pnpm install
```

## 📝 Environment Variables

**Required for API:**
- `DATABASE_URL`
- `REDIS_URL`
- `PROVIDER_MODE` (mock or twilio)
- `NEXTAUTH_SECRET`

**Required for Web:**
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

**Required for Twilio:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WEBHOOK_AUTH_TOKEN`
