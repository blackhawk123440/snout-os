# Phase 5.3: Dashboard Features - Current State Analysis

**Master Spec Reference**: Lines 148-153 (7.3 Sitter dashboard)
"Phase 5, sitter tiers and dashboards" - Step 3

**Date**: 2024-12-30

---

## Master Spec Requirements (7.3)

1. **7.3.1 Schedule and route view** - Schedule view with route optimization, map view with booking locations, optimize route order, show travel time
2. **7.3.2 Booking details with checklist, meds, notes, photos** - Checklist for each booking, display pet medications and schedules, show booking notes, support photo uploads/viewing, check-in/check-out
3. **7.3.3 Earnings and payouts view** - Total earnings (current period), earnings by booking, earnings by service type, pending payouts, payout history, payout request functionality, payout schedule
4. **7.3.4 Training and tier progress** - Display current tier, show tier progress (points, completion rate, response rate), show tier requirements, display training materials/completion, show tier history
5. **7.3.5 Tasks and exceptions** - Display assigned tasks, show exceptions (unpaid bookings, missing info, etc.), allow task completion, show exception resolution status

---

## Current State Analysis

### Existing Features (from `src/app/sitter/page.tsx`)

✅ **Basic Structure**:
- Tabs: today, upcoming, completed, earnings, settings
- Booking list display
- Booking details modal
- Earnings calculation (based on commission percentage)

✅ **Today/Upcoming/Completed Views**:
- Filter bookings by date and status
- Sort bookings
- Display booking details (client name, service, time, pets)
- Check-in functionality (basic)

✅ **Earnings Tab**:
- Basic earnings calculation displayed
- Shows total earnings for completed bookings

✅ **Tier Info**:
- Fetches and displays sitter tier info if available

---

## Missing Features (Per Master Spec)

### 7.3.1 Schedule and Route View
❌ **Missing**:
- Route optimization
- Map view with booking locations
- Optimize route order for efficiency
- Show travel time between bookings

**Current**: Basic schedule list view exists, but no route optimization or map

---

### 7.3.2 Booking Details with Checklist, Meds, Notes, Photos
⚠️ **Partially Implemented**:
- Booking details modal exists
- Notes displayed (basic)
- Pet information displayed

❌ **Missing**:
- Checklist for each booking
- Pet medications and schedules
- Photo uploads/viewing
- Enhanced check-in/check-out functionality

---

### 7.3.3 Earnings and Payouts View
⚠️ **Partially Implemented**:
- Basic earnings calculation and display
- Shows earnings for completed bookings

❌ **Missing**:
- Earnings by booking (detailed breakdown)
- Earnings by service type
- Pending payouts
- Payout history
- Payout request functionality
- Payout schedule

---

### 7.3.4 Training and Tier Progress
⚠️ **Partially Implemented**:
- Tier info displayed if available
- Dashboard API (`/api/sitters/[id]/dashboard`) provides tier progress data

❌ **Missing**:
- Display current tier (may exist but needs verification)
- Show tier progress (points, completion rate, response rate) - may be in dashboard API
- Show tier requirements
- Display training materials/completion
- Show tier history

**Note**: The dashboard API route (`/api/sitters/[id]/dashboard`) provides tier and performance data, but it may not be fully displayed in the UI

---

### 7.3.5 Tasks and Exceptions
❌ **Missing**:
- Display assigned tasks
- Show exceptions (unpaid bookings, missing info, etc.)
- Allow task completion
- Show exception resolution status

---

## Implementation Plan

### Priority 1: Core Features (Minimum Viable)
1. **Enhanced Earnings View** (7.3.3) - Most requested feature
   - Create earnings API endpoint
   - Display earnings by booking, by service type
   - Show payout status

2. **Tier Progress View** (7.3.4) - Leverage existing dashboard API
   - Display tier info from dashboard API
   - Show tier progress metrics
   - Show tier requirements

3. **Enhanced Booking Details** (7.3.2) - Incremental improvement
   - Add checklist UI (backend can come later)
   - Display medications if available in pet data
   - Photo viewing (upload can come later)

### Priority 2: Advanced Features
4. **Schedule and Route View** (7.3.1) - Complex feature
   - Map integration (Google Maps or similar)
   - Route optimization algorithm
   - Travel time calculation

5. **Tasks and Exceptions** (7.3.5) - Requires backend support
   - Task system backend
   - Exception tracking backend
   - UI for task completion

---

## Files to Create/Modify

### APIs
- `src/app/api/sitter/[id]/earnings/route.ts` - Earnings API (NEW)
- `src/app/api/sitter/[id]/payouts/route.ts` - Payouts API (NEW, if payout system exists)
- Enhance existing `src/app/api/sitters/[id]/dashboard/route.ts` (may already have tier data)

### UI
- `src/app/sitter/page.tsx` - Enhance existing dashboard (MODIFY)
- Components for earnings breakdown (NEW)
- Components for tier progress (NEW)
- Components for booking checklist (NEW)

---

## Next Steps

1. Create earnings API endpoint
2. Enhance earnings tab in sitter dashboard
3. Add tier progress display (leverage existing dashboard API)
4. Enhance booking details modal with checklist
5. Add schedule/route view (map integration)
6. Add tasks/exceptions view (if backend supports)

---

**Status**: Analysis complete, ready for implementation

