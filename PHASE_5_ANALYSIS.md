# Phase 5: Sitter Tiers and Dashboards - Current State Analysis

**Master Spec Reference**: Lines 277-283
"Phase 5, sitter tiers and dashboards"

**Date**: 2024-12-30

---

## Master Spec Requirements

### 7.1 Sitter roles and access
- 7.1.1 Sitters can see only their assigned bookings and limited client data required to do the job
- 7.1.2 Sitters cannot see payments, pricing settings, global automation settings, or other sitters data
- 7.1.3 Sitter messaging is allowed only in contexts tied to assignments

### 7.2 Sitter tiers
- 7.2.1 Tier definitions, probation, active, elite, specialist, lead
- 7.2.2 Tier rules, pay split, eligibility for complex routines, service types
- 7.2.3 Performance gates, no shows, lateness, client ratings, incident reports

### 7.3 Sitter dashboard
- 7.3.1 Schedule and route view
- 7.3.2 Booking details with checklist, meds, notes, photos
- 7.3.3 Earnings and payouts view
- 7.3.4 Training and tier progress
- 7.3.5 Tasks and exceptions

---

## Current State Analysis

### Existing Sitter Dashboard

**File**: `src/app/sitter/page.tsx`

**Current Features**:
- ✅ Displays sitter bookings (fetched from `/api/sitter/[id]/bookings`)
- ✅ Shows today, upcoming, completed, earnings tabs
- ✅ Calculates earnings based on commission percentage
- ✅ Displays booking details
- ✅ Shows sitter tier info (if available)

**Current Limitations**:
- ⚠️ Access control: Uses URL param `?id=` or localStorage - not authenticated
- ⚠️ No scoping: May show all bookings, not just assigned ones (needs verification)
- ⚠️ Limited client data: Shows full client info (may need to limit per spec 7.1.1)
- ⚠️ No access restrictions: Can see pricing, settings (violates spec 7.1.2)

**API Route**: `/api/sitter/[id]/bookings/route.ts`
- Needs analysis to verify scoping

---

### Existing Tier System

**Schema Models** (need to verify):
- `SitterTier` - Tier definitions
- `SitterTierHistory` - Tier progression history
- `Sitter.currentTierId` - Link to current tier

**API Routes**:
- `/api/sitter-tiers/` - Tier management
- `/api/sitter-tiers/calculate/` - Tier calculation
- `/api/sitter-tiers/[id]/` - Individual tier operations

**Settings Page**: `/settings/tiers/page.tsx`
- Admin interface for managing tiers

**Current Limitations**:
- ⚠️ Tier definitions may exist but rules/eligibility not fully implemented
- ⚠️ Performance gates (no shows, lateness, ratings) may not be tracked
- ⚠️ Pay split rules may not be enforced per tier

---

### Missing Features (Per Master Spec)

#### 7.1 Access Control
- ❌ Sitter authentication (ENABLE_SITTER_AUTH flag exists but may not be fully implemented)
- ❌ Scoped booking access (only assigned bookings)
- ❌ Limited client data (only what's needed for job)
- ❌ No access to payments, pricing settings, automation settings
- ❌ No access to other sitters' data
- ❌ Messaging scoped to assignments only

#### 7.2 Tier System
- ❌ Tier definitions: probation, active, elite, specialist, lead (may exist, needs verification)
- ❌ Tier rules: pay split, eligibility for complex routines, service types
- ❌ Performance gates: no shows, lateness, client ratings, incident reports

#### 7.3 Dashboard Features
- ⚠️ Schedule and route view (may exist, needs verification)
- ⚠️ Booking details with checklist, meds, notes, photos (may exist, needs verification)
- ⚠️ Earnings and payouts view (basic earnings exists, payouts may be missing)
- ❌ Training and tier progress
- ❌ Tasks and exceptions

---

## Next Steps

1. **Analyze Current Implementation**:
   - Read `/api/sitter/[id]/bookings/route.ts` to verify scoping
   - Read tier schema models to understand current structure
   - Read tier API routes to understand current functionality
   - Check if sitter auth is implemented

2. **Identify Gaps**:
   - Access control gaps
   - Tier system gaps
   - Dashboard feature gaps

3. **Plan Implementation**:
   - Phase 5.1: Sitter access control and scoping
   - Phase 5.2: Tier system implementation
   - Phase 5.3: Dashboard feature completion

---

## Files to Review

- `src/app/sitter/page.tsx` - Current sitter dashboard
- `src/app/api/sitter/[id]/bookings/route.ts` - Booking API (verify scoping)
- `prisma/schema.prisma` - Tier models
- `src/app/api/sitter-tiers/route.ts` - Tier API
- `src/app/settings/tiers/page.tsx` - Tier management UI
- `src/middleware.ts` - Check sitter auth implementation
- `src/lib/protected-routes.ts` - Check sitter route protection

---

**Status**: Analysis in progress

