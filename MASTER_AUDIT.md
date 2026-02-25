# Snout OS — Master Audit

**Last updated:** Feb 25, 2026
**Commit:** `b9a805fc233f939c8eee4a0e6ea3585270a3c84b`
**Build status:** Passing (exit 0, zero warnings/errors)
**Source files:** 469 TypeScript/TSX files
**Schema:** 1,682 lines, 79 models

---

## Architecture

Single Next.js 15 application — no separate API server, no NestJS, no monorepo.
Everything (UI + API routes + Twilio webhooks + Stripe webhooks) runs as one service.

- **Runtime:** Node.js 20, Next.js 15.5.12, React 18
- **Database:** PostgreSQL via Prisma 5.22
- **Auth:** NextAuth v5 (beta.30) with credentials provider
- **Package manager:** pnpm locally, npm on Render (`.npmrc` with `legacy-peer-deps=true`)
- **AI:** OpenAI via `@langchain/openai` + native `openai` SDK
- **SMS:** Twilio SDK (`twilio@5.11.2`) — direct `require('twilio')` in API routes
- **Payments:** Stripe (`stripe@14`)
- **Calendar:** Google Calendar via `googleapis@128`

---

## Deployment

### Render (`render.yaml`)

| Service | Type | Status |
|---------|------|--------|
| `snout-os-web` | Web (Node) | Active — `npm install && npm run build` / `npx prisma db push && npm run start` |
| `snout-os-db` | PostgreSQL | Active — Starter plan |
| ~~`snout-os-api`~~ | ~~Web~~ | **Deleted** — referenced nonexistent `enterprise-messaging-dashboard/` |
| ~~`snout-os-worker`~~ | ~~Worker~~ | **Deleted** — same |
| ~~`snout-os-redis`~~ | ~~Redis~~ | **Deleted** — no BullMQ workers in production |

### CI (`.github/workflows/ci.yml`)

| Job | Status |
|-----|--------|
| `build-and-test` | Passing — typecheck + build |
| `proof-pack` | Passing — runs after build-and-test, test steps are `continue-on-error` |
| ~~`lighthouse`~~ | Removed — no working test infrastructure |
| ~~`visual-regression`~~ | Removed — no baseline screenshots |

### Required Env Vars (Render)

```
DATABASE_URL          (from Render Postgres)
NEXTAUTH_URL          (from Render web service host)
NEXTAUTH_SECRET       (auto-generated)
OPENAI_API_KEY        (manual — for AI Daily Delight)
TWILIO_ACCOUNT_SID    (manual — for SMS)
TWILIO_AUTH_TOKEN      (manual — for SMS)
TWILIO_PHONE_NUMBER   (manual — for SMS from number)
```

---

## Database Schema (79 models)

### Core Business
| Model | Purpose |
|-------|---------|
| `Booking` | Central entity — service, schedule, pricing, status, client/sitter links |
| `Pet` | Pets on a booking |
| `TimeSlot` | Scheduled time windows per booking |
| `Client` | Client profiles with phone, email, lifetime value |
| `Sitter` | Sitter profiles with commission, tier, Google Calendar tokens |
| `Rate` | Service rate definitions |
| `Report` | Visit reports with media |

### Sitter Management
| Model | Purpose |
|-------|---------|
| `SitterPoolOffer` | Pool-based job offers to sitters |
| `BookingSitterPool` | Many-to-many booking↔sitter pool |
| `SitterTier` | Tier definitions (Foundation → Preferred) with permissions |
| `SitterTierHistory` | Tier change audit trail |
| `SitterTierSnapshot` | Rolling 30d/26w performance snapshots (SRS) |
| `SitterServiceEvent` | Coaching/corrective/probation events |
| `SitterTimeOff` | PTO and medical leave |
| `SitterCompensation` | Base pay, raises, perks |
| `SitterMetricsWindow` | Aggregated response/acceptance rates |
| `SitterVerification` | Background check and insurance status |
| `ServicePointWeight` | Points per service type |
| `OfferEvent` | Full offer lifecycle tracking |
| `VisitEvent` | Visit completion, lateness, checklists |

### Messaging System
| Model | Purpose |
|-------|---------|
| `MessageThread` | Conversation threads with scope, status, number assignment |
| `MessageEvent` | Individual messages with delivery tracking |
| `MessageParticipant` | Thread participants (client/sitter/owner/system) |
| `MessageNumber` | Phone numbers — pool, sitter, front_desk classes |
| `MessageAccount` | Provider accounts per org |
| `MessageResponseLink` | Links outbound prompts to inbound responses |
| `SitterMaskedNumber` | 1:1 sitter↔number mapping |
| `AssignmentWindow` | Time-bounded sitter assignments to threads |
| `ThreadAssignmentAudit` | Who reassigned what and when |
| `ResponseRecord` | SLA tracking per inbound message |
| `OptOutState` | SMS opt-in/opt-out per phone |
| `AntiPoachingAttempt` | Blocked attempts to share contact info |
| `ProviderCredential` | Encrypted Twilio credentials per org |
| `Message` | Legacy simple messages (booking-linked) |

### Automation Engine
| Model | Purpose |
|-------|---------|
| `Automation` | Automation definitions with scope and status |
| `AutomationTrigger` | Event triggers (booking.created, time.scheduled, etc.) |
| `AutomationConditionGroup` | AND/OR condition groups |
| `AutomationCondition` | Individual conditions |
| `AutomationAction` | Actions (sendSMS, assignSitter, etc.) |
| `AutomationTemplate` | SMS/email templates with variables |
| `AutomationRun` | Execution logs with idempotency |
| `AutomationRunStep` | Step-level execution detail |

### Payments & Payroll
| Model | Purpose |
|-------|---------|
| `StripeCharge` | Synced Stripe charges |
| `StripeRefund` | Synced refunds |
| `StripePayout` | Synced payouts |
| `StripeBalanceTransaction` | Balance transactions with fees |
| `PayrollRun` | Pay period runs (draft → paid) |
| `PayrollLineItem` | Per-sitter line items |
| `PayrollAdjustment` | Bonuses and deductions |

### AI Domination Layer (new)
| Model | Purpose |
|-------|---------|
| `LoyaltyReward` | Client loyalty points and tiers (bronze → platinum) |
| `PetHealthLog` | AI-generated health notes — daily, alert, vet, allergy |
| `SitterVerification` | Background check / insurance verification |
| `AnalyticsInsight` | AI-generated business insights (JSON) |
| `BookingCalendarEvent` | Google Calendar sync mapping per booking+sitter |

### Settings & Config
| Model | Purpose |
|-------|---------|
| `Setting` | Key-value settings |
| `BusinessSettings` | Business profile, hours, holidays, tax |
| `ServiceConfig` | Per-service pricing, rules, requirements |
| `PricingRule` | Dynamic pricing rules |
| `Discount` / `DiscountUsage` | Discount codes and usage tracking |
| `CustomField` / `CustomFieldValue` | User-defined fields on any entity |
| `FormField` | Booking form builder fields |
| `MessageTemplate` / `TemplateHistory` | SMS/email templates with versioning |
| `BookingTag` / `BookingTagAssignment` | Tagging system |
| `BookingPipeline` | Status pipeline definitions |
| `FeatureFlag` | Runtime feature flags |
| `EventLog` | System-wide event audit log |
| `BookingStatusHistory` | Booking status change trail |
| `BaselineSnapshot` | Pricing parity snapshots |

### Auth
| Model | Purpose |
|-------|---------|
| `User` | NextAuth users with optional sitter link |
| `Account` | OAuth accounts |
| `Session` | Active sessions |
| `VerificationToken` | Email verification |
| `Role` / `RolePermission` / `UserRole` | RBAC system |
| `GoogleCalendarAccount` | Legacy calendar OAuth |

---

## API Routes (80 endpoints)

### Bookings & Core
- `POST /api/form` — Booking form submission
- `GET/PATCH /api/bookings/[id]` — Booking CRUD (via catch-all)
- `POST /api/bookings/[id]/daily-delight` — AI Daily Delight report + SMS

### Sitter Dashboard
- `GET /api/sitters/[id]/dashboard` — Sitter dashboard data
- `POST /api/sitter/[id]/bookings/[bookingId]/accept` — Accept job
- `POST /api/sitter/[id]/bookings/[bookingId]/decline` — Decline job
- `GET /api/sitter/me/dashboard` — Authenticated sitter's own dashboard
- `GET /api/sitter/me/srs` — Sitter's own SRS metrics

### Messaging
- `GET /api/messages/threads` — List threads
- `GET /api/messages/threads/[id]` — Thread detail
- `GET /api/messages/threads/[id]/messages` — Thread messages
- `POST /api/messages/send` — Send message
- `POST /api/messages/[id]/retry` — Retry failed message
- `POST /api/messages/webhook/twilio` — Twilio inbound webhook
- `GET /api/sitter/threads` — Sitter's threads
- `GET /api/sitter/threads/[id]/messages` — Sitter thread messages

### Numbers
- `GET /api/numbers` — List numbers
- `POST /api/numbers/buy` — Buy new number
- `POST /api/numbers/import` — Import existing
- `PATCH /api/numbers/[id]/class` — Change number class
- `POST /api/numbers/[id]/assign` — Assign to sitter
- `POST /api/numbers/[id]/quarantine` — Quarantine
- `POST /api/numbers/[id]/release` — Release from quarantine
- `POST /api/numbers/[id]/release-to-pool` — Return to pool

### Setup & Provider
- `POST /api/setup/provider/connect` — Connect Twilio credentials
- `GET /api/setup/provider/status` — Provider connection status
- `POST /api/setup/provider/test` — Test SMS send
- `POST /api/setup/numbers/sync` — Sync Twilio numbers
- `POST /api/setup/webhooks/install` — Install Twilio webhooks
- `GET /api/setup/webhooks/status` — Webhook status
- `POST /api/setup/test-sms` — Quick test SMS
- `GET /api/setup/readiness` — Overall readiness check

### Dispatch
- `GET /api/dispatch/attention` — Bookings needing manual dispatch
- `POST /api/dispatch/force-assign` — Force-assign sitter
- `POST /api/dispatch/resume-automation` — Resume auto-dispatch

### SRS (Sitter Reliability System)
- `GET /api/sitters/[id]/srs` — Sitter SRS data
- `GET /api/sitters/srs` — All sitters SRS overview
- `POST /api/ops/srs/run-snapshot` — Trigger SRS snapshot
- `POST /api/ops/srs/run-weekly-eval` — Trigger weekly eval

### Auth
- `GET/POST /api/auth/[...nextauth]` — NextAuth routes
- `GET /api/auth/health` — Auth health check
- `GET /api/auth/config-check` — Auth config diagnostic
- `POST /api/auth/logout` — Logout

### Ops & Health
- `GET /api/health` — Platform health check
- `GET /api/ops/runtime-proof` — Deployment verification
- `GET /api/ops/build` — Build info
- `GET /api/ops/messaging-debug` — Messaging system debug

### Integrations
- `GET /api/integrations/google/start` — Google OAuth start
- `GET /api/integrations/google/callback` — Google OAuth callback
- `POST /api/sitters/[id]/calendar/toggle` — Toggle calendar sync

### Payments
- `POST /api/webhooks/stripe` — Stripe webhook handler
- `POST /api/twilio/inbound` — Twilio voice/SMS inbound

---

## UI Pages (25 routes)

| Route | Purpose |
|-------|---------|
| `/` | Landing/redirect |
| `/login` | Auth login page |
| `/dashboard` | Owner dashboard |
| `/bookings` | Booking list with filters |
| `/bookings/[id]` | Booking detail with Daily Delight button |
| `/calendar` | Calendar view |
| `/clients` | Client list |
| `/clients/[id]` | Client detail |
| `/sitters/[id]` | Sitter detail with SRS |
| `/sitter-dashboard` | Sitter job view with Daily Delight button |
| `/sitter/dashboard` | Alt sitter dashboard |
| `/sitter/inbox` | Sitter messaging |
| `/messages` | Owner messaging inbox |
| `/numbers` | Phone number management |
| `/assignments` | Assignment management |
| `/automation` | Automation overview |
| `/automation-center` | Automation builder |
| `/automations` | Automation list |
| `/settings` | Settings hub |
| `/setup` | Provider setup wizard |
| `/payments` | Payment tracking |
| `/payroll` | Payroll management |
| `/sitter-payroll` | Sitter payroll view |
| `/pricing` | Public pricing page |
| `/integrations` | Integration management |
| `/templates` | Message template editor |
| `/ui-kit` | Design system reference |

---

## Key Features

### Working in Production
- **Booking form** — Public form → booking creation → SMS confirmations
- **Sitter pool dispatch** — Auto/manual assignment with pool offers
- **Owner dashboard** — Booking management, client list, calendar
- **Sitter dashboard** — Job acceptance/decline, status updates
- **Messaging inbox** — Twilio-backed threaded messaging with masking
- **Number management** — Buy, import, assign, rotate pool numbers
- **Setup wizard** — Twilio connect, webhook install, test SMS
- **Stripe payments** — Webhook sync, charge/refund tracking
- **Payroll** — Period-based runs with adjustments
- **Automation engine** — Trigger → condition → action pipeline
- **RBAC** — Role-based permissions (owner, admin, sitter)
- **Auth** — NextAuth with credentials, session cookies

### AI Layer (New — Feb 2026)
- **Daily Delight** — AI-generated pet care reports via `POST /api/bookings/[id]/daily-delight`
  - Uses OpenAI to generate reports from pet + booking data
  - Auto-sends via Twilio SMS to client when configured
  - Button on both owner booking detail and sitter dashboard
- **Pet Health Logs** — `PetHealthLog` model for daily/alert/vet/allergy notes
- **Loyalty Rewards** — `LoyaltyReward` model with point tiers
- **Sitter Verification** — `SitterVerification` model for background checks
- **Analytics Insights** — `AnalyticsInsight` model for AI-generated business metrics
- **Calendar Sync** — `BookingCalendarEvent` + Google Calendar OAuth for sitters

### Scaffolded (models exist, UI partially built)
- **SRS (Sitter Reliability System)** — Full schema with snapshots, events, metrics windows; API routes exist, scoring engine in `src/lib/tiers/`
- **Anti-poaching** — Detection and blocking logic in `src/lib/messaging/anti-poaching-enforcement.ts`
- **Pricing engine** — Dynamic rules in `src/lib/pricing-engine.ts` with v1 parity harness
- **Custom fields** — Schema + API, UI in settings
- **Discount engine** — Codes, first-time, loyalty, referral discounts

---

## File Inventory

### `src/lib/` (key modules)
| File | Purpose |
|------|---------|
| `ai.ts` | AI service — `generateDailyDelight()` via LangChain/OpenAI |
| `auth.ts` | NextAuth config with credentials provider |
| `calendar-sync.ts` | Google Calendar sync for bookings |
| `db.ts` | Prisma client singleton |
| `env.ts` | Environment variable validation |
| `design-tokens.ts` | UI design system tokens |
| `navigation.ts` | App navigation structure |
| `sms-templates.ts` | Booking confirmation/reminder SMS templates |
| `message-utils.ts` | Unified SMS sending (OpenPhone fallback) |
| `pricing-engine.ts` | Dynamic pricing calculation |
| `automation-engine.ts` | Automation trigger/condition/action engine |
| `automation-executor.ts` | Automation run execution |
| `tier-engine.ts` | Sitter tier promotion/demotion logic |
| `dispatch-control.ts` | Booking dispatch state machine |
| `stripe-sync.ts` | Stripe data sync |
| `messaging/` | Full messaging subsystem (providers, routing, anti-poaching, sessions) |
| `messaging/providers/twilio.ts` | Twilio provider (send, receive, proxy, webhooks) |

---

## What's NOT in this repo

- No `enterprise-messaging-dashboard/` directory (was planned, never built)
- No NestJS backend
- No BullMQ workers (Redis not needed in production)
- No separate `@snoutos/api` or `@snoutos/shared` packages
- No Dockerfile
- No visual regression baselines

---

## Recent Commits (last 10)

```
b9a805f feat: complete non-monetization build - AI daily delight with SMS, new Prisma models, calendar sync
84a9a27 fix: exclude playwright.smoke.config.ts from tsconfig
3e4ae8a fix: suppress Critical dependency warning, add twilio to serverExternalPackages
35eafd7 fix(render): use npm instead of pnpm, fix build/start commands
6d532f8 ci: remove lighthouse and visual-regression jobs
cd9ab69 fix(render): remove nonexistent API/worker services, clean debug logs
191195c fix(ci): resolve visual-regression and lighthouse failures
604f474 fix: use valid ButtonVariant for Daily Delight buttons
70db8c4 feat: sitter Daily Delight button + SMS auto-send to client
30ca5f3 feat: calendar sync, pricing page, AI Daily Delight on booking detail, CI fix
```
