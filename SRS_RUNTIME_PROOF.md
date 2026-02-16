# SRS System Runtime Proof

## Overview

This document provides proof that the Sitter Growth Levels System (SRS) is working end-to-end with real event ingestion.

## Prerequisites

1. Database migration run: `npx prisma migrate dev --name add_srs_system`
2. Prisma client regenerated: `npx prisma generate`
3. Redis running (for background jobs)
4. Environment variable: `ENABLE_OPS_SRS=true` (for ops endpoints)

## Step 1: Seed Proof Data

**Endpoint:** `POST /api/messages/seed-srs-proof`

**Expected Response (200):**
```json
{
  "success": true,
  "seedOutput": "...",
  "snapshot": {
    "success": true,
    "sittersProcessed": 3,
    "snapshotsCreated": 3,
    "snapshotIds": ["..."],
    "snapshots": [
      {
        "sitterId": "...",
        "sitterName": "Fast Responder",
        "score": 85.5,
        "tier": "trusted",
        "provisional": false,
        "visits30d": 20
      },
      {
        "sitterId": "...",
        "sitterName": "Slow Responder",
        "score": 45.2,
        "tier": "foundation",
        "provisional": false,
        "visits30d": 15
      },
      {
        "sitterId": "...",
        "sitterName": "Low Activity",
        "score": 72.0,
        "tier": "reliant",
        "provisional": true,
        "visits30d": 8
      }
    ]
  }
}
```

**Screenshot:** `proof-pack/srs-seed-complete.png`
- Shows seed script output
- Shows snapshot creation results

## Step 2: Verify Database State

**Query 1: Check Snapshots Exist**
```sql
SELECT 
  s.id as sitter_id,
  s."firstName" || ' ' || s."lastName" as sitter_name,
  sts."asOfDate",
  sts."rolling30dScore",
  sts.tier,
  sts.provisional,
  sts."visits30d",
  sts."offers30d"
FROM "SitterTierSnapshot" sts
JOIN "Sitter" s ON s.id = sts."sitterId"
ORDER BY sts."asOfDate" DESC
LIMIT 10;
```

**Expected:** At least 3 snapshots (one per seeded sitter)

**Screenshot:** `proof-pack/srs-snapshots-db.png`

**Query 2: Check Response Links**
```sql
SELECT 
  COUNT(*) as total_links,
  COUNT(*) FILTER (WHERE "withinAssignmentWindow" = true) as within_window,
  COUNT(*) FILTER (WHERE excluded = true) as excluded,
  AVG("responseMinutes") as avg_response_minutes
FROM "MessageResponseLink"
WHERE "orgId" = '<org-id>';
```

**Expected:** 
- Total links: 20 (10 for Sitter A, 10 for Sitter B)
- Within window: 20
- Excluded: Some (PTO period)
- Avg response: ~62.5 minutes (mix of 5min and 120min)

**Screenshot:** `proof-pack/srs-response-links-db.png`

**Query 3: Check OfferEvents**
```sql
SELECT 
  "sitterId",
  COUNT(*) as total_offers,
  COUNT(*) FILTER (WHERE "acceptedAt" IS NOT NULL) as accepted,
  COUNT(*) FILTER (WHERE "declinedAt" IS NOT NULL) as declined
FROM "OfferEvent"
GROUP BY "sitterId";
```

**Expected:**
- Sitter A: 10 offers, 9 accepted, 1 declined
- Sitter B: 10 offers, 5 accepted, 5 declined

**Screenshot:** `proof-pack/srs-offer-events-db.png`

**Query 4: Check VisitEvents**
```sql
SELECT 
  "sitterId",
  COUNT(*) as total_visits,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  AVG("lateMinutes") as avg_late_minutes,
  SUM("checklistMissedCount") as total_missed_items
FROM "VisitEvent"
GROUP BY "sitterId";
```

**Expected:**
- Sitter A: 20 visits, all completed, avg late ~2min, 0 missed items
- Sitter B: 15 visits, all completed, avg late ~30min, some missed items
- Sitter C: 8 visits, all completed

**Screenshot:** `proof-pack/srs-visit-events-db.png`

## Step 3: Owner Dashboard View

**URL:** `/messages` → Internal tab "Sitters → Growth"

**Expected UI:**
- Table showing all 3 sitters
- Sitter A: Tier "Trusted", Score ~85, "On Track"
- Sitter B: Tier "Foundation", Score ~45, "On Track" or "At Risk"
- Sitter C: Tier "Reliant", Score ~72, "Provisional" badge

**Screenshot:** `proof-pack/srs-owner-dashboard.png`
- Shows table with all sitters
- Shows tier badges
- Shows scores and status

**Click Sitter A → Drilldown:**
- Rolling 30d score: ~85
- Rolling 26w score: N/A (first snapshot)
- Category breakdown visible
- Sample sizes shown
- No at-risk flag

**Screenshot:** `proof-pack/srs-owner-drilldown.png`

**Network Calls:**
```
GET /api/sitters/srs → 200
GET /api/sitters/<sitter-a-id>/srs → 200
```

## Step 4: Sitter Dashboard View

**URL:** `/sitter` or `/sitter/inbox`

**Expected UI:**
- "Your Level" card visible
- Shows tier badge
- Shows SRS score
- Shows "On track" or "At risk" status
- Shows next actions list
- Shows perks if applicable

**Screenshot:** `proof-pack/srs-sitter-dashboard.png`

**Network Call:**
```
GET /api/sitter/me/srs → 200
```

**Response Example:**
```json
{
  "tier": "trusted",
  "score": 85.5,
  "provisional": false,
  "atRisk": false,
  "breakdown": {
    "responsiveness": 20,
    "acceptance": 12,
    "completion": 8,
    "timeliness": 19.5,
    "accuracy": 20,
    "engagement": 10,
    "conduct": 10
  },
  "visits30d": 20,
  "rolling26w": null,
  "compensation": {
    "basePay": 12.50,
    "nextReviewDate": "2024-07-15T00:00:00Z"
  },
  "perks": {
    "priority": true,
    "multipliers": { "holiday": 1.5 },
    "mentorship": true,
    "reducedOversight": true
  },
  "nextActions": ["Maintain current performance to keep tier"]
}
```

## Step 5: Score Changes When Events Happen

### Test: Add Slow Response

**Action:** Create a slow response for Sitter A (outside assignment window or >90 minutes)

**Before:**
- Sitter A responsiveness: 20/20

**After running snapshot:**
- Sitter A responsiveness: <20/20 (decreased)

**Proof:**
1. Create MessageEvent (inbound client, requiresResponse=true)
2. Create MessageEvent (outbound sitter, 2 hours later)
3. Create MessageResponseLink (responseMinutes=120, withinAssignmentWindow=false)
4. Run snapshot: `POST /api/ops/srs/run-snapshot`
5. Check score: `GET /api/sitters/<sitter-a-id>/srs`
6. Verify responsiveness score decreased

**Screenshot:** `proof-pack/srs-score-changed.png`
- Before/after comparison
- Network calls showing score change

### Test: Add Visit with Penalties

**Action:** Create VisitEvent with checklistMissedCount=5

**Before:**
- Sitter A accuracy: 20/20

**After running snapshot:**
- Sitter A accuracy: <20/20 (decreased due to penalties)

**Proof:**
1. Create VisitEvent via `POST /api/ops/visits/capture` with checklistMissedCount=5
2. Run snapshot
3. Verify accuracy score decreased

**Screenshot:** `proof-pack/srs-accuracy-penalty.png`

## Step 6: Background Jobs

### Manual Snapshot Trigger

**Endpoint:** `POST /api/ops/srs/run-snapshot?date=2024-01-15`

**Expected Response (200):**
```json
{
  "success": true,
  "sittersProcessed": 3,
  "snapshotsCreated": 3,
  "snapshotIds": ["..."],
  "snapshots": [...]
}
```

**Screenshot:** `proof-pack/srs-snapshot-ops.png`

### Manual Weekly Evaluation

**Endpoint:** `POST /api/ops/srs/run-weekly-eval?weekOf=2024-01-15`

**Expected Response (200):**
```json
{
  "success": true,
  "sittersEvaluated": 3,
  "snapshots": [
    {
      "sitterId": "...",
      "sitterName": "Fast Responder",
      "tier": "trusted",
      "atRisk": false
    }
  ]
}
```

**Screenshot:** `proof-pack/srs-weekly-eval-ops.png`

## Step 7: Exclusions Work

### PTO Exclusion

**Verify:** Sitter B has responses excluded during PTO period

**Query:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE excluded = true AND "excludedReason" LIKE '%Time off%') as excluded_pto
FROM "MessageResponseLink"
WHERE "threadId" IN (
  SELECT id FROM "MessageThread" WHERE "assignedSitterId" = '<sitter-b-id>'
);
```

**Expected:** Some responses marked excluded with reason "Time off period"

**Screenshot:** `proof-pack/srs-pto-exclusion.png`

## Step 8: Acceptance Rate Changes

**Test:** Decline an offer for Sitter A

**Before:**
- Sitter A acceptance: 12/12 (90%+)

**Action:**
1. Create OfferEvent (via booking assignment)
2. Decline via `POST /api/sitter/<sitter-a-id>/bookings/<booking-id>/decline`
3. Run snapshot

**After:**
- Sitter A acceptance: <12/12 (decreased)

**Screenshot:** `proof-pack/srs-acceptance-rate-change.png`

## Step 9: Provisional Status

**Verify:** Sitter C shows provisional badge

**Check:**
- Sitter C has <15 visits30d
- Snapshot shows provisional=true
- UI shows "Provisional" badge
- Tier promotions blocked

**Screenshot:** `proof-pack/srs-provisional-status.png`

## Network Checklist

All endpoints must return 200:

- [ ] `POST /api/messages/seed-srs-proof` → 200
- [ ] `POST /api/ops/srs/run-snapshot` → 200
- [ ] `GET /api/sitters/srs` → 200
- [ ] `GET /api/sitters/<id>/srs` → 200
- [ ] `GET /api/sitter/me/srs` → 200
- [ ] `POST /api/ops/visits/capture` → 200
- [ ] `POST /api/sitters/<id>/service-events` → 200
- [ ] `POST /api/sitters/<id>/time-off` → 200

## Database Checklist

All queries must return expected data:

- [ ] Snapshots exist for all seeded sitters
- [ ] Response links exist and are linked correctly
- [ ] OfferEvents exist with accept/decline records
- [ ] VisitEvents exist with status and penalties
- [ ] TimeOff records exist
- [ ] Compensation records exist
- [ ] Exclusions are marked correctly

## Screenshot Checklist

- [ ] `srs-seed-complete.png` - Seed script output
- [ ] `srs-snapshots-db.png` - Database snapshots query
- [ ] `srs-response-links-db.png` - Response links query
- [ ] `srs-offer-events-db.png` - Offer events query
- [ ] `srs-visit-events-db.png` - Visit events query
- [ ] `srs-owner-dashboard.png` - Owner growth tab
- [ ] `srs-owner-drilldown.png` - Owner drilldown view
- [ ] `srs-sitter-dashboard.png` - Sitter "Your Level" card
- [ ] `srs-score-changed.png` - Score change proof
- [ ] `srs-accuracy-penalty.png` - Accuracy penalty proof
- [ ] `srs-snapshot-ops.png` - Snapshot ops endpoint
- [ ] `srs-weekly-eval-ops.png` - Weekly eval ops endpoint
- [ ] `srs-pto-exclusion.png` - PTO exclusion proof
- [ ] `srs-acceptance-rate-change.png` - Acceptance rate change
- [ ] `srs-provisional-status.png` - Provisional status

## How to Run

### 1. Seed Proof Data
```bash
curl -X POST http://localhost:3000/api/messages/seed-srs-proof \
  -H "Cookie: $(cat .auth-cookie)" \
  | jq
```

### 2. Run Snapshot
```bash
curl -X POST "http://localhost:3000/api/ops/srs/run-snapshot?date=$(date +%Y-%m-%d)" \
  -H "Cookie: $(cat .auth-cookie)" \
  | jq
```

### 3. View Owner Dashboard
1. Navigate to `/messages`
2. Click internal tab "Sitters → Growth"
3. Verify table shows all sitters with scores

### 4. View Sitter Dashboard
1. Navigate to `/sitter` or `/sitter/inbox`
2. Verify "Your Level" card shows score and tier

### 5. Test Score Changes
```bash
# Create visit with penalty
curl -X POST http://localhost:3000/api/ops/visits/capture \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .auth-cookie)" \
  -d '{
    "orgId": "...",
    "sitterId": "...",
    "bookingId": "...",
    "scheduledStart": "2024-01-15T10:00:00Z",
    "scheduledEnd": "2024-01-15T12:00:00Z",
    "status": "completed",
    "checklistMissedCount": 5
  }'

# Run snapshot again
curl -X POST "http://localhost:3000/api/ops/srs/run-snapshot?date=$(date +%Y-%m-%d)" \
  -H "Cookie: $(cat .auth-cookie)"

# Verify score changed
curl http://localhost:3000/api/sitters/<sitter-id>/srs \
  -H "Cookie: $(cat .auth-cookie)" \
  | jq '.snapshot.rolling30dBreakdown.accuracy'
```

## Commit Information

**Files Changed:**
- `prisma/schema.prisma` - Added SRS models
- `src/lib/tiers/srs-engine.ts` - Scoring engine
- `src/lib/tiers/tier-rules.ts` - Tier and pay rules
- `src/lib/tiers/message-instrumentation.ts` - Message processing
- `src/lib/tiers/srs-queue.ts` - Background jobs
- `src/lib/tiers/event-hooks.ts` - Event creation hooks
- `src/app/api/sitters/[id]/srs/route.ts` - Owner SRS endpoint
- `src/app/api/sitters/srs/route.ts` - Owner list endpoint
- `src/app/api/sitter/me/srs/route.ts` - Sitter endpoint
- `src/app/api/ops/srs/run-snapshot/route.ts` - Snapshot ops
- `src/app/api/ops/srs/run-weekly-eval/route.ts` - Eval ops
- `src/app/api/ops/visits/capture/route.ts` - Visit capture
- `src/app/api/messages/seed-srs-proof/route.ts` - Seed endpoint
- `src/components/sitter/SitterSRSCard.tsx` - Sitter UI
- `src/components/sitter/SitterGrowthTab.tsx` - Owner UI
- `scripts/seed-srs-proof.ts` - Seed script
- `src/lib/tiers/__tests__/srs-engine.test.ts` - Tests

**Total Files:** 17 new files, 3 modified files
