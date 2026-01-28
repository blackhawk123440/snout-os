# SnoutOS Enterprise Messaging Dashboard

Enterprise-grade messaging infrastructure control center built per the [Enterprise Messaging Dashboard Specification v1.1](./ENTERPRISE_MESSAGING_DASHBOARD_SPEC.md).

## 🎯 Overview

This is a complete monorepo implementation of the SnoutOS Enterprise Messaging Dashboard, providing:

- **Complete Twilio Abstraction**: Operators never need to log into Twilio
- **Deterministic Routing Engine**: Fixed evaluation order with complete traceability
- **Append-Only Audit System**: Full observability and compliance
- **Number Lifecycle Management**: Quarantine, cooldown, health monitoring
- **Policy Enforcement**: Anti-poaching detection and blocking
- **Automation System**: Trigger-based automations with test mode
- **Setup Wizard**: 7-step guided configuration

## 🏗️ Architecture

```
enterprise-messaging-dashboard/
├── apps/
│   ├── api/          # NestJS backend API
│   └── web/          # Next.js frontend dashboard
├── packages/
│   └── shared/       # Shared types and schemas
└── docker-compose.yml # Postgres + Redis
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 1. Clone and Install

```bash
cd enterprise-messaging-dashboard
pnpm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Setup Database

```bash
cd apps/api
pnpm db:migrate
pnpm db:seed
```

The seed script creates:
- Demo organization
- Owner user (email: `owner@example.com`, password: `password123`)
- Sample clients, sitters, numbers, threads, and data

### 4. Start Development Servers

From the root directory:

```bash
pnpm dev
```

This starts:
- API server on http://localhost:3001
- Web dashboard on http://localhost:3000

### 5. Access Dashboard

1. Navigate to http://localhost:3000
2. You'll be redirected to `/setup` (Setup Wizard)
3. Complete the 7-step setup wizard
4. Access the dashboard at http://localhost:3000/dashboard

## 📋 Setup Wizard Steps

The setup wizard guides you through:

1. **Connect Provider**: Enter Twilio credentials (or use Mock mode)
2. **Verify Connectivity**: Test connection and permissions
3. **Front Desk Number**: Buy or import Front Desk number
4. **Sitter Numbers**: Buy or import sitter numbers (optional)
5. **Pool Numbers**: Buy or import pool numbers (optional)
6. **Webhook Installation**: Automatic webhook configuration
7. **System Readiness**: Validation and completion

## 🔧 Configuration

### Environment Variables

Create `.env` files in `apps/api` and `apps/web`:

**apps/api/.env:**
```env
# Database
DATABASE_URL="postgresql://snoutos:snoutos_dev_password@localhost:5432/snoutos_messaging?schema=public"

# Redis (for BullMQ workers)
REDIS_URL="redis://localhost:6379"

# Provider Configuration
PROVIDER_MODE="mock"  # or "twilio" for production
TWILIO_ACCOUNT_SID=""  # Required if PROVIDER_MODE=twilio
TWILIO_AUTH_TOKEN=""   # Required if PROVIDER_MODE=twilio
TWILIO_WEBHOOK_AUTH_TOKEN=""  # For webhook signature verification

# JWT Authentication
JWT_SECRET="dev-secret-change-in-production"  # Use strong random secret in production
JWT_EXPIRES_IN="7d"  # Token expiry (default: 7 days)

# Encryption (for provider credentials at rest)
ENCRYPTION_KEY=""  # 32-byte hex string for AES-256 encryption

# Server
PORT=3001
NODE_ENV="development"  # or "production"

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS="http://localhost:3000,https://your-domain.com"
```

**apps/web/.env.local:**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### Provider Modes

- **`mock`**: Development mode - no Twilio credentials needed. Simulates all Twilio operations.
- **`twilio`**: Production mode - requires valid Twilio credentials.

## 🧪 Testing

### Unit Tests

```bash
cd apps/api
pnpm test
```

### Integration Tests (Audit Completeness + Invariants)

```bash
cd apps/api
pnpm test -- audit-completeness
pnpm test -- invariants
```

### E2E Tests (Playwright)

```bash
cd apps/web
pnpm test:e2e
```

### Test Coverage

The test suite includes:
- **Audit Completeness**: Verifies all key mutations emit audit events
- **Invariant Tests**: Ensures masking, thread-bound sending, idempotency, and window enforcement
- **Routing Determinism**: Fixed evaluation order with traceability
- **Pool Reuse Leakage Prevention**: Prevents number reuse across threads
- **Policy Enforcement**: Role-based blocking and warnings
- **Number State Machine**: Valid transitions and guardrails
- **Webhook Idempotency**: Duplicate prevention
- **E2E Smoke Tests**: End-to-end user flows

## 📡 Simulating Twilio Webhooks

### Mock Provider Mode

In mock mode, you can simulate webhooks using the Mock Provider:

```typescript
// Example: Simulate inbound SMS
const mockProvider = new MockProviderService();
const { messageSid, rawBody } = mockProvider.simulateInboundMessage({
  from: '+15551234567',
  to: '+15551111111',  // Your Front Desk number
  body: 'Hello, this is a test message',
});

// POST to /webhooks/twilio/inbound-sms
```

### Production Mode (Twilio)

1. Configure webhook URL in Twilio console: `http://your-domain.com/webhooks/twilio/inbound-sms`
2. Twilio will send webhooks automatically when messages are received
3. Webhook signatures are verified automatically

## 🗄️ Database Schema

The Prisma schema includes all models from the specification:

- `Organization`, `User`, `Client`, `ClientContact`, `Sitter`
- `MessageNumber` (with lifecycle states)
- `Thread`, `ThreadParticipant`, `Message`, `MessageDelivery`
- `AssignmentWindow`, `RoutingOverride`
- `PolicyViolation`
- `Automation`, `AutomationExecution`
- `Alert`
- `AuditEvent` (append-only)

See `apps/api/prisma/schema.prisma` for complete schema.

## 🔐 Authentication

### Current Implementation

- Simple email/password authentication
- JWT tokens (7-day expiry)
- Role-based access control (Owner/Sitter/Admin future)

### Login

```bash
POST /api/auth/login
{
  "email": "owner@example.com",
  "password": "password123"
}
```

Returns:
```json
{
  "access_token": "jwt-token",
  "user": { ... }
}
```

## 🎨 Frontend Pages

- `/setup` - Setup Wizard (7 steps)
- `/dashboard` - Main dashboard
- `/numbers` - Number Inventory
- `/routing` - Routing Control & Simulator
- `/inbox` - Messaging Inbox
- `/assignments` - Assignments & Windows
- `/audit` - Audit & Compliance
- `/automations` - Automations
- `/alerts` - Alerts & Escalation
- `/settings` - Provider & System Settings

## 🔍 Key Features

### Deterministic Routing

The routing engine evaluates rules in fixed order:

1. Hard safety blocks (permissions, anti-poaching, leakage prevention)
2. Active routing override (thread-scoped, time-bounded)
3. Assignment window routing (time-bounded)
4. Default fallback (Owner Inbox)

Every routing decision produces a complete trace with:
- Input snapshot
- Ruleset version
- Step-by-step evaluation
- Final target and reasoning

### Audit System

All system actions are logged to `audit_events` table:
- Message sends/receives
- Routing decisions
- Number state changes
- Policy violations
- Automation executions
- Webhook receipts

**Critical**: Audit events are append-only and cannot be deleted.

### Number Lifecycle

Numbers follow a state machine:
- **Active**: Available for use
- **Quarantined**: In cooldown (90 days default, min 30 days)
- **Inactive**: Deactivated

Guardrails:
- Cannot quarantine last Front Desk number
- Cannot release Front Desk to pool
- Quarantine requires reason + impact preview

### Policy Enforcement

Anti-poaching detection for:
- Phone numbers (including obfuscations)
- Email addresses
- URLs
- Social media handles

Failure modes:
- Sitter outbound: Block + route to owner review
- Owner outbound: Allow with warning
- Inbound: Allow but flag

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Numbers
- `GET /api/numbers` - List numbers (with filters)
- `POST /api/numbers/purchase` - Buy number
- `POST /api/numbers/:id/quarantine` - Quarantine number

### Routing
- `POST /api/routing/simulate` - Simulate routing (read-only)
- `GET /api/routing/threads/:id/history` - Routing history

### Threads
- `GET /api/threads` - List threads

### Messages
- `GET /api/messages/threads/:id` - Get messages for thread

### Assignments
- `GET /api/assignments/windows` - List assignment windows

### Setup
- `POST /api/setup/test-connection` - Test provider connection
- `GET /api/setup/readiness` - Check system readiness

### Webhooks
- `POST /webhooks/twilio/inbound-sms` - Receive inbound SMS
- `POST /webhooks/twilio/status-callback` - Delivery status updates

## 🛠️ Development

### Running the Application

**Start infrastructure (Postgres + Redis):**
```bash
docker-compose up -d
```

**Start API server:**
```bash
cd apps/api
pnpm dev
```

**Start web dashboard:**
```bash
cd apps/web
pnpm dev
```

**Start background workers (BullMQ):**
```bash
cd apps/api
pnpm start  # Workers start automatically with API server
```

### Running Playwright Tests

```bash
cd apps/web
pnpm test:ui
```

### Adding a New Module

1. Create module in `apps/api/src/[module-name]/`
2. Add service, controller, and module files
3. Register module in `app.module.ts`
4. Add API routes
5. Create frontend page in `apps/web/src/app/[page-name]/`

### Database Migrations

**Development:**
```bash
cd apps/api
pnpm db:migrate
```

**Production:**
```bash
cd apps/api
pnpm prisma migrate deploy
```

**Important:** The performance indexes migration (`add_performance_indexes`) is **required for scale assumptions**. Ensure all migrations are applied in production before handling production traffic.

**Migration Files:**
- Migrations are stored in `apps/api/prisma/migrations/`
- Each migration includes SQL for schema changes and indexes
- Never edit existing migrations - create new ones for changes

### Viewing Database

```bash
cd apps/api
pnpm db:studio
```

Opens Prisma Studio at http://localhost:5555

## 🚀 Production Notes

### Required Environment Variables

See [Configuration](#-configuration) section above for complete list. Critical variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (for BullMQ)
- `JWT_SECRET` - Strong random secret for JWT signing
- `ENCRYPTION_KEY` - 32-byte hex string for encrypting provider credentials
- `PROVIDER_MODE` - Set to `"twilio"` for production
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - Twilio credentials
- `CORS_ORIGINS` - Comma-separated list of allowed frontend origins

### Rate Limiting

Rate limits are configured in `apps/api/src/app.module.ts`:
- **Default**: 100 requests/minute globally
- **Strict**: 10 requests/minute (for sensitive endpoints like login)
- **Webhooks**: 100-200 requests/minute (allows Twilio retries)
- **Messaging**: 30 messages/minute per user

To adjust limits, modify `ThrottlerModule.forRoot()` configuration.

### Diagnostics Mode

**Owner-only** feature accessible in Settings. When enabled:
- Reveals provider IDs (SIDs) in number/message details
- Shows webhook URLs and provider configuration
- Displays raw provider responses for debugging

**Security Note**: Diagnostics mode should only be enabled for troubleshooting. It exposes internal provider details that operators normally don't need to see.

### Running Workers

Background workers (BullMQ) process:
- Message retry queue (`message-retry`)
- Automation execution queue (`automation`)

Workers start automatically with the API server. To run workers separately:

```bash
cd apps/api
# Workers are initialized in WorkersModule.onModuleInit()
# They run in the same process as the API server
```

### Health Checks

Monitor system health via:
- **API Endpoint**: `GET /api/ops/health` (Owner-only)
- **UI**: `/ops` page → "Health Checks" tab

Health checks include:
- Provider connection status
- Last webhook received timestamp
- Queue health (waiting/active/failed counts)
- Database latency

### Dead-Letter Queue (DLQ)

Failed jobs after max retries are moved to DLQ:
- **View**: `/ops` page → "Dead-Letter Queue" tab
- **Replay**: Click "Replay" on a job (requires reason)
- **Ignore**: Click "Ignore" to archive (requires reason)

All DLQ actions are audited.

## 🚨 Important Notes

### Determinism Guarantees

- Routing evaluation is deterministic (same inputs → same outputs)
- All routing decisions are logged with complete trace
- Routing simulator is read-only (does not mutate state)

### Idempotency

- Webhook message SIDs are used as idempotency keys
- Duplicate webhooks are safely rejected
- Database transactions prevent race conditions

### Masking Invisibility

- Sitters never see real client numbers
- Clients never see sitter numbers
- All masking is automatic and implicit
- Operators never configure masking manually

### Twilio Abstraction

- Operators never need to log into Twilio
- All operations available in dashboard
- Provider errors translated to human language
- Mock mode for local development

## 📚 Documentation

- [Enterprise Messaging Dashboard Specification](./ENTERPRISE_MESSAGING_DASHBOARD_SPEC.md) - Complete product spec
- [API Documentation](./docs/api.md) - API reference (TODO)
- [Architecture Guide](./docs/architecture.md) - System architecture (TODO)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if Postgres is running
docker-compose ps

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
pnpm db:migrate
pnpm db:seed
```

### API Not Starting

```bash
# Check if port 3001 is available
lsof -i :3001

# Check environment variables
cat apps/api/.env
```

### Frontend Not Loading

```bash
# Check if port 3000 is available
lsof -i :3000

# Clear Next.js cache
rm -rf apps/web/.next
```

## 📝 License

Proprietary - SnoutOS

## 👥 Contributing

This is an internal enterprise system. All changes must align with the Enterprise Messaging Dashboard Specification.

---

**Built with**: Next.js, NestJS, Prisma, PostgreSQL, Redis, TypeScript, Tailwind CSS
