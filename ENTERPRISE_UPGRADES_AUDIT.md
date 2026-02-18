# Enterprise Upgrades Audit Report

**Date**: 2025-01-XX  
**Purpose**: Audit existing implementations before making targeted enterprise upgrades

---

## PHASE 0 — AUDIT FINDINGS

### 1) TIER UI AUDIT

#### Existing Components Found:
- **TierTab**: `src/components/sitter/TierTab.tsx`
  - Uses tier names: Bronze, Silver, Gold, Platinum
  - Shows current tier, metrics breakdown, tier history, improvement hints
  - No progression visualization (stepper/icons)
  - No "year/level" representation

- **TierSummaryCard**: `src/components/sitter/TierSummaryCard.tsx`
  - Uses tier names: Bronze, Silver, Gold, Platinum
  - Shows summary metrics only

- **SitterTierBadge**: `src/components/sitter/SitterTierBadge.tsx`
  - Uses tier names: Trainee, Certified, Trusted, Elite
  - Has canonical color mapping for these 4 tiers
  - Used across the app for tier display

#### Tier Naming Mismatch:
- **TierTab/TierSummaryCard**: Bronze, Silver, Gold, Platinum
- **SitterTierBadge**: Trainee, Certified, Trusted, Elite
- **tier-engine-twilio.ts**: Bronze, Silver, Gold, Platinum (computation)
- **Database (SitterTier)**: Name field can be any string
- **Seed files**: Trainee, Certified, Trusted, Elite (canonical)

**CONCLUSION**: There is a naming mismatch. The badge component uses Trainee/Certified/Trusted/Elite, but TierTab and tier engine use Bronze/Silver/Gold/Platinum.

#### Tier Data Sources:
- **SitterTierHistory**: `prisma/schema.prisma` line 651 - tracks tier changes over time
- **SitterMetricsWindow**: `prisma/schema.prisma` line 1538 - tracks metrics for tier computation
- **SitterTier**: `prisma/schema.prisma` line 615 - tier definitions with name, priorityLevel, etc.

#### Missing Features:
- No tier progression visualization (stepper with icons)
- No "year/level" representation
- No progress indicators toward next tier
- Tier naming is inconsistent across components

---

### 2) BOOKING EDIT AUDIT

#### Existing Components Found:
- **BookingForm**: `src/components/bookings/BookingForm.tsx`
  - Supports `mode: 'create' | 'edit'`
  - Has `initialValues` prop for prefilling
  - Used in `/bookings/new` page ✅

- **bookingToFormValues**: `src/lib/bookings/booking-form-mapper.ts`
  - Maps booking record to BookingForm initialValues
  - Handles timeSlots, pets, dates, etc.

- **Booking Detail Page**: `src/app/bookings/[id]/page.tsx`
  - Has `handleEditBooking` function (line 216)
  - Uses `showEditModal` state
  - Currently uses inline edit logic, not BookingForm component

- **EditBookingModal**: `src/components/booking/EditBookingModal.tsx`
  - EXISTS - separate component
  - Need to verify if it uses BookingForm or is duplicate

#### Booking Fetch Endpoint:
- **GET /api/bookings/[id]**: `src/app/api/bookings/[id]/route.ts`
  - Returns full booking with pets, timeSlots, client, sitter, etc.

#### Missing Features:
- Booking detail page does NOT use BookingForm for editing
- EditBookingModal may be a duplicate form (needs verification)
- No unified edit flow using the canonical BookingForm

---

### 3) MESSAGING ERRORS AUDIT

#### Existing Error Handling:
- **Twilio Inbound Route**: `src/app/api/twilio/inbound/route.ts`
  - Line 479-482: Returns TwiML error message if number not found
  - Line 500-520: Routes to owner inbox if client not found
  - Uses `recordSitterAuditEvent` for audit logging (line 19)
  - Error handling exists but routing failures may not be logged as EventLog entries

#### Audit/Event Logging:
- **recordSitterAuditEvent**: `src/lib/audit-events.ts`
  - Records events to EventLog model
  - Supports metadata for context

- **ActivityTab**: `src/components/sitter/ActivityTab.tsx`
  - Shows sitter activity events
  - Fetches from `/api/sitters/[id]/activity`
  - Has event type labels for various events
  - Does NOT currently show messaging/routing errors

#### Missing Features:
- Routing failures (number not found, client not found, etc.) are not logged as EventLog entries
- No owner-visible surface for messaging errors
- No remediation guidance for routing failures

---

## WHAT WILL BE REUSED

### Tier System:
- ✅ TierTab component (will enhance, not replace)
- ✅ TierSummaryCard (will keep as-is)
- ✅ SitterTierBadge (will add mapping layer)
- ✅ tier-engine-twilio.ts (will add display mapping only)
- ✅ SitterTierHistory model
- ✅ SitterMetricsWindow model

### Booking Edit:
- ✅ BookingForm component (will use for edit)
- ✅ bookingToFormValues mapper (will use for prefill)
- ✅ GET /api/bookings/[id] endpoint (will use for fetching)
- ✅ PATCH /api/bookings/[id] endpoint (will use for saving)

### Messaging Errors:
- ✅ recordSitterAuditEvent helper (will use for logging)
- ✅ ActivityTab component (will enhance to show errors)
- ✅ EventLog model (will use for storage)

---

## WHAT WILL BE IMPLEMENTED

### Feature A - Enterprise Tier UI:
1. Create tier name mapping layer (Trainee/Certified/Trusted/Elite → Bronze/Silver/Gold/Platinum)
2. Add TierProgression component to TierTab with:
   - Stepper visualization
   - Icons for each tier
   - Year/Level markers
   - Locked/unlocked states
   - Progress indicators
3. Update TierTab, TierSummaryCard, SitterTierBadge to use unified naming

### Feature B - Unified Booking Edit:
1. Replace EditBookingModal with BookingForm in edit mode
2. Update booking detail page to use BookingForm for editing
3. Ensure all fields prefill correctly using bookingToFormValues

### Feature C - Messaging Error Visibility:
1. Add EventLog entries for routing failures in Twilio inbound route
2. Enhance ActivityTab to show messaging errors
3. Add remediation guidance text for each error type

---

## FILES TO MODIFY

### Feature A:
- `src/components/sitter/TierTab.tsx` - Add progression component
- `src/components/sitter/TierSummaryCard.tsx` - Add name mapping
- `src/components/sitter/SitterTierBadge.tsx` - Add name mapping
- `src/lib/tiers/tier-name-mapper.ts` - CREATE (mapping layer)
- `src/lib/tiers/tier-engine-twilio.ts` - Add display mapping only

### Feature B:
- `src/app/bookings/[id]/page.tsx` - Replace edit modal with BookingForm
- `src/components/booking/EditBookingModal.tsx` - DELETE (if duplicate)
- `src/lib/bookings/booking-form-mapper.ts` - Verify/enhance prefill logic

### Feature C:
- `src/app/api/twilio/inbound/route.ts` - Add EventLog entries for failures
- `src/components/sitter/ActivityTab.tsx` - Add messaging error display
- `src/app/api/sitters/[id]/activity/route.ts` - Verify/enhance to include messaging errors
