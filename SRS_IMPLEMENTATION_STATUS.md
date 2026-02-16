# Sitter Growth Levels System (SRS) Implementation Status

## Overview

This document tracks the implementation of the Service Reliability Score (SRS) system based on `SITTER_TIER_SYSTEM_DESIGN.md`. The system is event-driven, auditable, org-scoped, and deterministic.

## ✅ Completed Components

### A) Data Model (Prisma)

**New Models Added:**
- `SitterTierSnapshot` - Daily materialized snapshots with 30d and 26w scores
- `SitterServiceEvent` - Coaching/corrective/probation events
- `SitterTimeOff` - PTO and medical leave tracking
- `OfferEvent` - Booking offer acceptance/decline tracking
- `VisitEvent` - Visit completion, timeliness, and accuracy tracking
- `SitterCompensation` - Pay rate and raise tracking
- `MessageResponseLink` - Links responses to requiring messages for responsiveness

**Enhanced Models:**
- `MessageEvent` - Added `responseToMessageId`, `answeredAt`, `correlationIds`
- `Sitter` - Added relations to all new SRS models
- `Booking` - Added relations to `OfferEvent` and `VisitEvent`
- `MessageThread` - Added relation to `MessageResponseLink`

**Location:** `prisma/schema.prisma`

### B) Twilio Event Instrumentation

**File:** `src/lib/tiers/message-instrumentation.ts`

**Features:**
- `requiresResponse()` - Determines if a message requires response (client inbound, not system)
- `linkResponseToRequiringMessage()` - Links responses to requiring messages (FIFO, idempotent)
- `processMessageEvent()` - Processes new messages and updates requiresResponse flags
- `excludeTimeOffResponses()` - Excludes responses during PTO/medical leave
- `excludeSystemOutageResponses()` - Excludes responses during system outages

**Deterministic Rules:**
- Only inbound client messages require response
- System/automation messages excluded
- Policy violations excluded
- Webhook status callbacks excluded
- Responses linked to most recent unanswered requiring message

### C) Scoring Engine

**File:** `src/lib/tiers/srs-engine.ts`

**Implements Exact Specification:**
- **Responsiveness (20%)**: Median response time bands (≤5m=20, 5-10=16, 10-20=12, 20-45=8, 45-90=4, >90=0)
- **Booking Reliability (25%)**: 
  - Acceptance (12): ≥90%=12, 85-89=10, 80-84=8, 75-79=6, 70-74=4, <70=0
  - Completion (8): ≥99=8, 97-98.9=6, 95-96.9=4, 92-94.9=2, <92=0
- **Timeliness (20%)**: OnTime +1, LateMinor 0, LateMajor -2, Missed -6; normalized to 0-20
- **Visit Accuracy (20%)**: Penalties per 10 visits; score = max(0, 20 - PenaltyPer10)
- **Engagement (10%)**: Quota % bands (≥100=10, 90-99=8, 80-89=6, 70-79=4, <70=0)
- **Conduct (10%)**: none=10, 1 coaching=7, 2 coaching=5, corrective=2, probation=0

**Provisional Rule:** visits30d < 15 → provisional=true, tier promotions blocked

**Functions:**
- `calculateSRS()` - Main calculation function
- `calculateRolling26WeekScore()` - 26-week rolling average

### D) Tier Rules + Pay Rules

**File:** `src/lib/tiers/tier-rules.ts`

**Tier Bands:**
- Foundation: 0-69
- Reliant: 70-79
- Trusted: 80-89
- Preferred: 90-100

**Promotion Rules:**
- Requires threshold met for 2 consecutive weekly evaluations
- No corrective action in last 30 days
- visits30d >= 15

**Demotion Rules:**
- Below tier min for 2 consecutive weeks OR immediate corrective/probation

**Stability:**
- 1 week dip → atRisk=true but do not demote

**Pay Model:**
- Base pay starts at $12.50
- Raise eligibility: 2.5% every 6 months if rolling26w >= 80 and no corrective actions
- Cap at $16.25
- After cap: perks (priority, multipliers, mentorship)

**Functions:**
- `checkPromotionEligibility()`
- `checkDemotionRequired()`
- `checkAtRisk()`
- `checkPayRaiseEligibility()`
- `getTierPerks()`

### E) Background Jobs (BullMQ)

**File:** `src/lib/tiers/srs-queue.ts`

**Jobs:**
- `daily-snapshot` - Runs nightly per org, creates `SitterTierSnapshot` records
- `weekly-evaluation` - Runs weekly, decides promotion/demotion/atRisk

**Features:**
- Idempotent (checks for existing snapshots)
- Emits audit events (`sitter.srs.snapshot.created`, `sitter.tier.promoted`, etc.)
- Retry logic with exponential backoff
- Job scheduling functions: `scheduleDailySnapshots()`, `scheduleWeeklyEvaluations()`

**Worker:** `createSRSWorker()` - Processes jobs with concurrency=5

### F) Dashboard UI

**Sitter View:**
- **File:** `src/components/sitter/SitterSRSCard.tsx`
- Shows tier badge, SRS score, breakdown, at-risk status, next actions, perks, compensation
- Uses React Query to fetch from `/api/sitter/me/srs`

**Owner View:**
- **TODO:** Create owner view component in `/messages` tab
- Should show table with all sitters, tier, score, trend, at-risk status, breakdown

### G) API Endpoints

**Owner Endpoints:**
- `GET /api/sitters/:id/srs` - Get SRS data for a specific sitter
- `GET /api/sitters/srs` - List all sitters with SRS data
- `POST /api/sitters/:id/service-events` - Create service event (coaching/corrective/probation)
- `POST /api/sitters/:id/time-off` - Create time off record (PTO/medical)

**Sitter Endpoints:**
- `GET /api/sitter/me/srs` - Get own SRS data

**All endpoints:**
- Enforce org scoping server-side
- Require authentication
- Role-based access control (owner vs sitter)

## ⚠️ Pending Components

### F) Dashboard UI (Owner View)

**Needed:**
1. Owner view component in `/messages` tab (internal sub-tab: "Sitters → Growth")
2. Table showing:
   - Sitter name
   - Current Tier badge
   - SRS 30d (with provisional badge)
   - Trend (7d delta)
   - At risk status + reason
   - Breakdown mini-bars (6 categories)
   - Last evaluated date
3. Drilldown drawer with:
   - 30d chart (score over time)
   - Category breakdown
   - "What to do next" list
   - Exclusions shown (PTO, system exclusions)
   - Audit log links

**Location:** Should be added to `/src/app/messages/page.tsx` or similar

### H) Tests

**Needed Tests:**
1. `median response time uses only messages that require response`
2. `responses outside assignment windows are excluded`
3. `PTO excludes responsiveness tracking`
4. `weekly evaluation doesn't whiplash (stability rule)`
5. `corrective action triggers conduct score drop + tier restriction`

**Location:** Create `src/lib/tiers/__tests__/` directory

### I) Seed Data + Acceptance Criteria

**Needed:**
1. Seeded data creating:
   - One sitter with fast responses → high responsiveness score
   - One sitter with slow responses → low score
   - One sitter on PTO → excluded responsiveness samples
2. Screenshots checklist
3. Network proof (API responses)

**Location:** Create seed script in `scripts/seed-srs-proof.ts`

## 🔧 Integration Points Needed

### 1. Message Event Processing

**Where:** When messages are created (likely in webhook handlers or message creation logic)

**Action:** Call `processMessageEvent()` from `message-instrumentation.ts`

**Example:**
```typescript
import { processMessageEvent } from '@/lib/tiers/message-instrumentation';

// After creating MessageEvent
await processMessageEvent(orgId, threadId, messageEventId, {
  direction: 'inbound',
  actorType: 'client',
  body: messageBody,
  hasPolicyViolation: false,
  createdAt: new Date(),
});
```

### 2. Offer Event Creation

**Where:** When booking offers are made to sitters

**Action:** Create `OfferEvent` record

**Example:**
```typescript
await prisma.offerEvent.create({
  data: {
    orgId,
    sitterId,
    bookingId,
    threadId,
    offeredAt: new Date(),
    withinAvailability: true,
    leadTimeValid: true,
    routingValid: true,
    excluded: false,
  },
});
```

### 3. Visit Event Creation

**Where:** When visits are completed/checked in/checked out

**Action:** Create or update `VisitEvent` record

**Example:**
```typescript
await prisma.visitEvent.create({
  data: {
    orgId,
    sitterId,
    bookingId,
    scheduledStart: booking.startAt,
    scheduledEnd: booking.endAt,
    checkInAt: new Date(),
    status: 'completed',
    lateMinutes: 0,
    checklistMissedCount: 0,
    mediaMissingCount: 0,
    excluded: false,
  },
});
```

### 4. Background Job Scheduling

**Where:** In application startup or cron job

**Action:** Schedule daily snapshots and weekly evaluations

**Example:**
```typescript
import { scheduleDailySnapshots, scheduleWeeklyEvaluations } from '@/lib/tiers/srs-queue';

// Daily at midnight
cron.schedule('0 0 * * *', async () => {
  const orgs = await getAllOrgs();
  for (const org of orgs) {
    await scheduleDailySnapshots(org.id);
  }
});

// Weekly on Sundays
cron.schedule('0 0 * * 0', async () => {
  const orgs = await getAllOrgs();
  for (const org of orgs) {
    await scheduleWeeklyEvaluations(org.id);
  }
});
```

### 5. Worker Initialization

**Where:** In application startup

**Action:** Initialize SRS worker

**Example:**
```typescript
import { createSRSWorker } from '@/lib/tiers/srs-queue';

const srsWorker = createSRSWorker();
console.log('SRS worker started');
```

## 📋 Database Migration Required

**Action:** Run Prisma migration to create new tables

```bash
npx prisma migrate dev --name add_srs_system
```

## 🎯 Next Steps

1. **Run Migration:** Create database tables
2. **Integrate Event Creation:** Add OfferEvent and VisitEvent creation in booking/visit flows
3. **Integrate Message Processing:** Call `processMessageEvent()` when messages are created
4. **Schedule Background Jobs:** Set up cron jobs for daily/weekly processing
5. **Create Owner UI:** Build owner dashboard view
6. **Write Tests:** Create comprehensive test suite
7. **Create Seed Data:** Build proof data and screenshots

## 📝 Notes

- All scoring is deterministic and auditable via correlation IDs
- System-caused issues are excluded (routing errors, tech outages, client delays)
- PTO/medical leave excludes responsiveness tracking
- Assignment windows are respected for responsiveness calculations
- Org scoping is enforced on all queries
- All actions emit audit events for traceability
