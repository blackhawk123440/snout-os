# Snout OS

Pet care operations platform for bookings, messaging, and sitter management.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with DATABASE_URL, etc.
npm run db:push
npm run dev
```

## SMS Provider

**Primary provider: Twilio.** The messaging inbox, webhooks, and send flows use Twilio.

- **Setup:** Connect via `/setup` (Twilio Connect) or set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`
- **Env vars:** See `.env.example` for `TWILIO_*` variables
- **OpenPhone:** Optional; used only for legacy owner-alert flows when `OPENPHONE_API_KEY` is set

## Rate Limiting

Public and abusable endpoints (auth callbacks, booking form, message send) are rate limited. Defaults:

- In-memory fallback when `REDIS_URL` is not set (single-instance; resets on restart)
- Redis-backed when `REDIS_URL` is configured (shared across instances)

Returns `429 Too Many Requests` with `Retry-After` header when exceeded.

## Providers

- **TanStack Query:** Single `QueryClientProvider` at app root (`src/components/providers.tsx`)
- **Auth:** NextAuth with Prisma adapter
- **Database:** PostgreSQL via Prisma

## Workers

Background workers process automation jobs (booking alerts, confirmations, reminders) via BullMQ.

**Run locally:**
```bash
REDIS_URL=redis://localhost:6379 npm run worker
```

- Requires `REDIS_URL` (Redis for job queue)
- Processes: automations, reminders, daily summary, pool release, pricing reconciliation
- Logs startup + queue connections; jobs log success/failure to EventLog

**Production:** Run the worker as a separate process (e.g. Render Background Worker, `npm run worker`).

## Docs

Project documentation lives in [`/docs`](docs/):

- [CONTRIBUTING.md](CONTRIBUTING.md) — Setup, tests, PR checks, quarantined tests
- [docs/FEATURE_GATE.md](docs/FEATURE_GATE.md) — Feature completion gate
- [docs/MASTER_GAP_LIST.md](docs/MASTER_GAP_LIST.md) — Spec vs repo audit
- [docs/UI_DONE_CHECKLIST.md](docs/UI_DONE_CHECKLIST.md) — UI consistency checklist
- [docs/CLIENT_QA_CHECKLIST.md](docs/CLIENT_QA_CHECKLIST.md) — Client portal QA
- [docs/SITTER_QA_CHECKLIST.md](docs/SITTER_QA_CHECKLIST.md) — Sitter dashboard QA

## Scripts

- `npm run dev` — Start dev server
- `npm run worker` — Start background workers (requires REDIS_URL)
- `npm run build` — Build for production
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm run test:core` — Core tests (CI gate; excludes slow/quarantined)
- `npm run test` — Full test suite
