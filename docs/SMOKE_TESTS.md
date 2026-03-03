# Smoke Tests

Local and CI smoke test harness for Snout OS.

## Quick Start (Local)

```bash
pnpm test:ui:smoke:local
```

This single command:
1. Starts Postgres via Docker (port 5433)
2. Resets DB (migrate + seed)
3. Starts Next.js with smoke env
4. Runs Playwright smoke tests
5. Shuts down cleanly

**Prerequisites:** Docker Desktop (running), Node 20+, pnpm

## Environment

Copy `.env.smoke.example` to `.env.smoke`:

```bash
cp .env.smoke.example .env.smoke
```

The smoke env uses:
- `DATABASE_URL` → `postgresql://postgres:postgres@localhost:5433/snout_smoke`
- `SMOKE=true` → relaxes Stripe/S3 checks in verify-runtime (test-only)
- `ENABLE_E2E_LOGIN=true` → allows E2E auth for Playwright

No real Stripe, Twilio, or Google credentials required.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm db:smoke:up` | Start Postgres container |
| `pnpm db:smoke:down` | Stop and remove container |
| `pnpm db:smoke:reset` | Down -v, up, migrate, seed |
| `pnpm test:ui:smoke:local` | Full harness: reset → server → tests → teardown |
| `pnpm test:ui:smoke` | Playwright only (CI starts server separately) |

## CI

CI uses its own Postgres service and starts the app with `pnpm start`. It runs `pnpm test:ui:smoke` with `reuseExistingServer: true`. Production runtime checks remain strict; only smoke/e2e mode relaxes optional integration checks.
