# Phase 5: Sitter Tiers and Dashboards - Implementation Plan

**Master Spec Reference**: Lines 277-283, 137-153
"Phase 5, sitter tiers and dashboards"

**Date**: 2024-12-30

---

## Current State Summary

### ✅ What Exists

1. **Sitter Dashboard** (`src/app/sitter/page.tsx`):
   - Basic dashboard with tabs (today, upcoming, completed, earnings, settings)
   - Fetches bookings for a sitter ID
   - Calculates earnings based on commission percentage
   - Shows tier info if available

2. **Booking API** (`src/app/api/sitter/[id]/bookings/route.ts`):
   - ✅ Already scoped: Returns only bookings where `sitterId = id`
   - Returns full booking data with pets

3. **Tier System**:
   - `SitterTier` model exists with: name, pointTarget, minCompletionRate, minResponseRate, benefits, priorityLevel, canTakeHouseSits, canTakeTwentyFourHourCare
   - `SitterTierHistory` model for tracking tier progression
   - Tier API routes exist (`/api/sitter-tiers/`)
   - Tier management UI exists (`/settings/tiers/page.tsx`)

4. **Infrastructure**:
   - `ENABLE_SITTER_AUTH` flag exists in middleware
   - User model links to Sitter (`User.sitterId`)

---

## Gaps Identified (Per Master Spec)

### 7.1 Sitter Roles and Access

**Missing**:
- ❌ Sitter authentication (uses URL param `?id=`, not authenticated)
- ❌ Limited client data (returns full client info, should limit per spec 7.1.1)
- ❌ Access restrictions (no enforcement of "cannot see payments, pricing settings, automation settings, other sitters")
- ❌ Messaging scoping (no enforcement of "only in contexts tied to assignments")

**Current**: API returns all booking data including full client info

---

### 7.2 Sitter Tiers

**Partially Implemented**:
- ✅ Tier definitions exist (SitterTier model)
- ⚠️ Tier rules: Pay split may not be enforced per tier (uses commissionPercentage on Sitter, not tier-based)
- ⚠️ Eligibility for complex routines: `canTakeHouseSits`, `canTakeTwentyFourHourCare` exist but may not be enforced
- ❌ Performance gates: No tracking of no shows, lateness, client ratings, incident reports

**Missing Tier Definitions**:
- ❌ "probation" tier (may exist but needs verification)
- ❌ "active" tier (may exist but needs verification)
- ❌ "elite" tier (may exist but needs verification)
- ❌ "specialist" tier (may exist but needs verification)
- ❌ "lead" tier (may exist but needs verification)

---

### 7.3 Sitter Dashboard

**Partially Implemented**:
- ⚠️ Schedule and route view (basic schedule exists, route view unclear)
- ⚠️ Booking details (exists but may not have checklist, meds, notes, photos)
- ⚠️ Earnings view (basic earnings calculation exists, payouts view unclear)
- ❌ Training and tier progress
- ❌ Tasks and exceptions

---

## Implementation Plan

### Phase 5.1: Sitter Access Control and Scoping

**Goal**: Implement proper sitter authentication and data scoping per spec 7.1

**Tasks**:

1. **Sitter Authentication**:
   - Implement sitter login flow (use existing NextAuth with sitter credentials)
   - Update middleware to handle sitter routes when `ENABLE_SITTER_AUTH=true`
   - Create sitter-specific login page or route
   - Link sitter User accounts to Sitter records

2. **Scoped Booking Access**:
   - ✅ Already implemented: API returns only assigned bookings
   - Add verification that API enforces `sitterId` match
   - Add access control to prevent sitter from accessing other sitters' bookings

3. **Limited Client Data**:
   - Modify `/api/sitter/[id]/bookings` to return only necessary client fields:
     - firstName, lastName (for identification)
     - phone (for contact)
     - address (for job location)
     - pets (for job requirements)
   - Remove: email (if not needed), payment info, pricing details, other bookings

4. **Access Restrictions**:
   - Ensure sitter routes cannot access:
     - `/api/payments/*` (payment admin routes)
     - `/api/settings/*` (global settings)
     - `/api/automations/*` (automation settings)
     - `/api/sitters/*` (other sitters' data)
   - Add middleware checks or API route guards

5. **Messaging Scoping**:
   - Verify messaging is only allowed for assigned bookings
   - Add checks in message sending endpoints

**Files to Modify**:
- `src/app/api/sitter/[id]/bookings/route.ts` - Limit client data returned
- `src/middleware.ts` - Add sitter route protection
- `src/lib/protected-routes.ts` - Define sitter routes
- `src/app/login/page.tsx` - Support sitter login
- Message sending routes - Add assignment checks

---

### Phase 5.2: Tier System Implementation

**Goal**: Complete tier system with rules, eligibility, and performance gates per spec 7.2

**Tasks**:

1. **Tier Definitions**:
   - Verify/create standard tiers: probation, active, elite, specialist, lead
   - Ensure tier definitions match master spec requirements

2. **Tier Rules - Pay Split**:
   - Implement tier-based commission percentages
   - Update earnings calculation to use tier commission if available, fallback to Sitter.commissionPercentage
   - Ensure tier rules override sitter-level commission

3. **Tier Rules - Eligibility**:
   - Enforce `canTakeHouseSits` when assigning house sitting bookings
   - Enforce `canTakeTwentyFourHourCare` when assigning 24/7 care bookings
   - Add checks in booking assignment logic

4. **Performance Gates**:
   - Track no shows (booking status = confirmed but not completed, past endAt)
   - Track lateness (check-in time vs scheduled startAt)
   - Track client ratings (if rating system exists)
   - Track incident reports (if incident system exists)
   - Update tier calculation to consider performance gates

5. **Tier Calculation**:
   - Implement automatic tier calculation based on:
     - Points (from ServicePointWeight)
     - Completion rate
     - Response rate
     - Performance gates (no shows, lateness, ratings, incidents)
   - Update sitter tiers periodically (daily/weekly job)

**Files to Create/Modify**:
- `src/lib/tier-calculator.ts` - Tier calculation logic
- `src/lib/tier-rules.ts` - Tier eligibility and pay split rules
- `src/lib/performance-tracker.ts` - Track no shows, lateness, ratings, incidents
- `src/app/api/sitter-tiers/calculate/route.ts` - Enhance tier calculation
- Booking assignment logic - Add tier eligibility checks
- Earnings calculation - Use tier-based commission

---

### Phase 5.3: Dashboard Feature Completion

**Goal**: Complete all dashboard features per spec 7.3

**Tasks**:

1. **Schedule and Route View** (7.3.1):
   - Enhance schedule view with route optimization
   - Show map view with booking locations
   - Optimize route order for efficiency
   - Show travel time between bookings

2. **Booking Details** (7.3.2):
   - Add checklist for each booking (meds, feeding, exercise, etc.)
   - Display pet medications and schedules
   - Show booking notes
   - Support photo uploads/viewing
   - Add check-in/check-out functionality

3. **Earnings and Payouts View** (7.3.3):
   - Enhance earnings view with:
     - Total earnings (current period)
     - Earnings by booking
     - Earnings by service type
     - Pending payouts
     - Payout history
   - Add payout request functionality
   - Show payout schedule

4. **Training and Tier Progress** (7.3.4):
   - Display current tier
   - Show tier progress (points, completion rate, response rate)
   - Show tier requirements
   - Display training materials/completion
   - Show tier history

5. **Tasks and Exceptions** (7.3.5):
   - Display assigned tasks
   - Show exceptions (unpaid bookings, missing info, etc.)
   - Allow task completion
   - Show exception resolution status

**Files to Create/Modify**:
- `src/app/sitter/page.tsx` - Enhance dashboard with all features
- `src/app/api/sitter/[id]/earnings/route.ts` - Earnings API
- `src/app/api/sitter/[id]/payouts/route.ts` - Payouts API
- `src/app/api/sitter/[id]/tasks/route.ts` - Tasks API
- `src/app/api/sitter/[id]/checklist/route.ts` - Checklist API
- Route optimization logic
- Photo upload/viewing components

---

## Implementation Order

1. **Phase 5.1** (Access Control) - Foundation for security
2. **Phase 5.2** (Tier System) - Core business logic
3. **Phase 5.3** (Dashboard Features) - User experience

---

## Feature Flags

- `ENABLE_SITTER_AUTH` - Enable sitter authentication (default: false)
- Consider adding: `ENABLE_TIER_SYSTEM` if tier features need gradual rollout

---

## Master Spec Compliance Checklist

### 7.1 Sitter Roles and Access
- [ ] Sitters can see only their assigned bookings
- [ ] Limited client data (only what's needed for job)
- [ ] Cannot see payments, pricing settings, automation settings
- [ ] Cannot see other sitters' data
- [ ] Messaging only in contexts tied to assignments

### 7.2 Sitter Tiers
- [ ] Tier definitions: probation, active, elite, specialist, lead
- [ ] Tier rules: pay split, eligibility for complex routines, service types
- [ ] Performance gates: no shows, lateness, client ratings, incident reports

### 7.3 Sitter Dashboard
- [ ] Schedule and route view
- [ ] Booking details with checklist, meds, notes, photos
- [ ] Earnings and payouts view
- [ ] Training and tier progress
- [ ] Tasks and exceptions

---

**Status**: Planning complete, ready for implementation

