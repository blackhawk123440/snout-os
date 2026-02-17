# SRS/Tier System Implementation Proof

## Files Modified

### 1. Owner SRS Card Component (NEW)
**File:** `src/components/sitter/OwnerSRSCard.tsx`
- **Lines:** 1-238 (entire file)
- **Purpose:** Full SRS breakdown card for owners viewing sitter profiles
- **Features:**
  - Tier badge with color coding
  - Current SRS score (30-day)
  - 26-week average (if available)
  - Category breakdown (7 categories)
  - At-risk indicators
  - Next actions
  - Compensation info
  - Raise eligibility status
  - Empty state when no data

### 2. Sitter Profile Page
**File:** `src/app/sitters/[id]/page.tsx`
- **Line 28:** Added import: `import { OwnerSRSCard } from '@/components/sitter/OwnerSRSCard';`
- **Line 537:** Added `<OwnerSRSCard sitterId={sitterId} />` before Quick Actions card
- **Location:** Right column, after Messaging section, before Quick Actions

### 3. Sitter Landing Page Redirect
**File:** `src/app/sitter/page.tsx`
- **Lines:** 1-25 (replaced entire file)
- **Change:** Now redirects `/sitter` → `/sitter/dashboard`
- **Implementation:** Client-side redirect using `useRouter().replace()`

## API Endpoints

### Owner View: GET /api/sitters/:id/srs
**File:** `src/app/api/sitters/[id]/srs/route.ts`
- **Auth:** Owner/admin only
- **Returns:**
  - `snapshot`: Latest tier snapshot with breakdown
  - `current`: Calculated SRS if no snapshot
  - `rolling26w`: 26-week rolling score
  - `compensation`: Base pay and review date
- **Status Codes:**
  - 200: Success
  - 401: Unauthorized
  - 403: Forbidden (not owner/admin)
  - 404: Sitter not found
  - 500: Server error

### Sitter Self View: GET /api/sitter/me/srs
**File:** `src/app/api/sitter/me/srs/route.ts`
- **Auth:** Sitter only (self-scoped)
- **Returns:** Same structure as owner endpoint
- **Status Codes:** Same as above

## UI Locations

### Owner View
**Route:** `/sitters/[id]`
**Component:** `OwnerSRSCard`
**Location:** Right sidebar, after Messaging section
**Shows:**
- Service Reliability Score section header
- Tier badge (Foundation/Reliant/Trusted/Preferred)
- Current score (30-day)
- 26-week average
- Category breakdown grid
- At-risk warnings
- Next actions list
- Compensation info
- Raise eligibility

### Sitter Self View
**Route:** `/sitter/dashboard`
**Component:** `SitterSRSCard`
**Location:** Grid with Performance Snapshot
**Shows:**
- "Your Level" section header
- Tier badge
- SRS score
- Breakdown
- Perks unlocked
- Next actions

### Owner Growth Table
**Route:** `/messages?tab=sitters&subtab=growth`
**Component:** `SitterGrowthTab`
**Shows:**
- Table of all sitters with SRS scores
- Tier badges
- Drilldown to individual sitter profiles

## Expected UI Screenshots Checklist

### ✅ /sitters/[id] showing tiers
- [ ] Service Reliability Score card visible in right sidebar
- [ ] Tier badge displayed (Foundation/Reliant/Trusted/Preferred)
- [ ] Score shown as X.X/100
- [ ] Category breakdown visible (7 categories)
- [ ] Next actions list shown (if applicable)
- [ ] Empty state shown if no score yet

### ✅ /sitter showing tiers
- [ ] Redirects from `/sitter` to `/sitter/dashboard`
- [ ] "Your Level" card visible
- [ ] Tier badge displayed
- [ ] SRS score shown
- [ ] All 7 dashboard sections visible

### ✅ /messages?tab=sitters&subtab=growth showing growth table
- [ ] Growth tab visible
- [ ] Table with sitter names and scores
- [ ] Tier badges in table
- [ ] API call to `/api/sitters/srs` returns 200

## Network Proof Expectations

### GET /api/sitters/:id/srs
**Expected Response (200):**
```json
{
  "snapshot": {
    "tier": "foundation",
    "rolling30dScore": 75.5,
    "rolling30dBreakdown": {
      "responsiveness": 18,
      "acceptance": 10,
      "completion": 7,
      "timeliness": 15,
      "accuracy": 18,
      "engagement": 8,
      "conduct": 10
    },
    "rolling26wScore": 72.0,
    "provisional": false,
    "atRisk": false,
    "visits30d": 20,
    "offers30d": 15
  },
  "current": null,
  "rolling26w": 72.0,
  "compensation": {
    "basePay": 25.00,
    "nextReviewDate": "2024-12-01"
  }
}
```

**Empty State Response (200):**
```json
{
  "snapshot": null,
  "current": null,
  "rolling26w": null,
  "compensation": null
}
```

### GET /api/sitter/me/srs
**Expected Response (200):**
```json
{
  "tier": "foundation",
  "score": 75.5,
  "provisional": false,
  "atRisk": false,
  "breakdown": {
    "responsiveness": 18,
    "acceptance": 10,
    "completion": 7,
    "timeliness": 15,
    "accuracy": 18,
    "engagement": 8,
    "conduct": 10
  },
  "visits30d": 20,
  "rolling26w": 72.0,
  "compensation": {
    "basePay": 25.00,
    "nextReviewDate": "2024-12-01"
  },
  "perks": {
    "priority": false,
    "multipliers": { "holiday": 1.0 },
    "mentorship": false,
    "reducedOversight": false
  },
  "nextActions": [
    "Maintain current performance to keep tier"
  ]
}
```

## Feature Flags / Environment Variables

**None required** - SRS system is always enabled when:
- Database has `SitterTierSnapshot` table
- API routes are accessible
- User has proper role (owner/admin for `/api/sitters/:id/srs`, sitter for `/api/sitter/me/srs`)

## Commits

- `58f2d59` - feat: Add OwnerSRSCard to sitter profile page and fix /sitter redirect
- `[latest]` - fix: Resolve TypeScript error in OwnerSRSCard visits30d check

## Verification Steps

1. **Owner Profile View:**
   - Navigate to `/sitters/[any-sitter-id]`
   - Verify "Service Reliability Score" card appears in right sidebar
   - Check API call to `/api/sitters/:id/srs` returns 200
   - Verify tier badge, score, and breakdown render

2. **Sitter Self View:**
   - Log in as sitter
   - Navigate to `/sitter` (should redirect to `/sitter/dashboard`)
   - Verify "Your Level" card appears
   - Check API call to `/api/sitter/me/srs` returns 200

3. **Owner Growth Table:**
   - Navigate to `/messages?tab=sitters&subtab=growth`
   - Verify table with sitter SRS data appears
   - Check API call to `/api/sitters/srs` returns 200

## Known Issues / Limitations

- If no snapshot exists and calculation fails, shows empty state (expected)
- Provisional status shown when <15 visits in 30 days
- At-risk status shown when score below tier minimum
- Compensation only shown if `SitterCompensation` record exists
