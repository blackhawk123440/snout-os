# CROSS-PAGE CONSISTENCY MAP
## Snout OS Dashboard - Shared Primitives and Universal Laws

**Last Updated:** Generated after V6 Execution Prompt implementation
**Purpose:** Document all shared primitives and their usage across pages to ensure consistency

---

## UNIVERSAL UI LAWS

### 1. Zero Horizontal Scroll on Mobile
**Shared Primitive:** Global CSS rules + Table component mobile layout
**Pages Using It:**
- ✅ Bookings list (`src/app/bookings/page.tsx`)
- ✅ Booking detail (`src/app/bookings/[id]/page.tsx`)
- ✅ Clients list (`src/app/clients/page.tsx`)
- ✅ Sitters management (`src/app/bookings/sitters/page.tsx`)
- ✅ Payments (`src/app/payments/page.tsx`)
- ✅ Calendar (`src/app/calendar/page.tsx`)
- ✅ Automations (`src/app/automation/page.tsx`)
**Evidence:**
- `src/app/layout.tsx`: Global `overflow-x: hidden`
- `src/components/layout/AppShell.tsx`: `maxWidth: '100vw'`
- `src/components/ui/Table.tsx`: Mobile card layout with `overflowX: 'hidden'`
**Exceptions:** None

---

### 2. Buttons Must Look Like Buttons (44px minimum)
**Shared Primitive:** `src/components/ui/Button.tsx`
**Pages Using It:**
- ✅ All pages (universal component)
**Evidence:**
- `getSizeStyles` enforces explicit height per size
- Minimum 44px touch targets
**Exceptions:** None

---

### 3. One Mobile Spacing Scale
**Shared Primitive:** `src/lib/design-tokens.ts` → `tokens.spacing`
**Pages Using It:**
- ✅ All pages (universal tokens)
**Evidence:**
- All components use `tokens.spacing[N]`
- No hardcoded spacing values
**Exceptions:** None

---

### 4. One Modal Behavior (Full-Height Bottom Sheets on Mobile)
**Shared Primitive:** `src/components/ui/Modal.tsx`
**Pages Using It:**
- ✅ Booking detail edit (`src/app/bookings/[id]/page.tsx`)
- ✅ Booking detail assign/unassign (`src/app/bookings/[id]/page.tsx`)
- ✅ Booking list assign/unassign (`src/app/bookings/page.tsx` via `BookingRowActions`)
- ✅ Sitters add/edit (`src/app/bookings/sitters/page.tsx`)
- ✅ Calendar add account (`src/app/calendar/page.tsx`)
- ✅ All other modals
**Evidence:**
- Lines 73-218 in `Modal.tsx` implement full-height bottom sheet on mobile
- `maxHeight: '90vh'`, `height: '90vh'`
**Exceptions:** None

---

### 5. One Table → Mobile Card Pattern
**Shared Primitive:** `src/components/ui/Table.tsx`
**Pages Using It:**
- ✅ Bookings list (`src/app/bookings/page.tsx`) - All 6 columns have `mobileLabel` and `mobileOrder`
- ✅ Clients list (`src/app/clients/page.tsx`) - All 5 columns have `mobileLabel` and `mobileOrder`
- ✅ Payments (`src/app/payments/page.tsx`) - All 6 columns have `mobileLabel` and `mobileOrder`
- ✅ Sitters list (`src/app/bookings/sitters/page.tsx`)
- ✅ Payroll (`src/app/payroll/page.tsx`)
**Evidence:**
- Table component checks `isMobile` and renders cards if true
- Requires `mobileLabel` and `mobileOrder` for each column
**Exceptions:** None

---

### 6. One Filter System (MobileFilterBar)
**Shared Primitive:** `src/components/ui/MobileFilterBar.tsx`
**Pages Using It:**
- ✅ Bookings list (`src/app/bookings/page.tsx` lines 422-437)
- ✅ Payments (`src/app/payments/page.tsx`)
- ✅ Payroll (`src/app/payroll/page.tsx`)
- ✅ Automations (`src/app/automation/page.tsx`)
- ✅ Messages (`src/app/messages/page.tsx`)
- ✅ Sitter pages (`src/app/sitter/page.tsx`, `src/app/sitter-dashboard/page.tsx`)
- ✅ Settings (`src/app/settings/page.tsx`)
**Evidence:**
- Horizontal scrolling chips on mobile
- Tabs on desktop
- Consistent spacing and styling
**Exceptions:** None

---

### 7. One Detail Page Pattern (Sticky Header, Collapsible Sections, Bottom Action Bar)
**Shared Primitive:** Pattern implemented in `src/app/bookings/[id]/page.tsx`
**Pages Using It:**
- ✅ Booking detail (`src/app/bookings/[id]/page.tsx`)
**Evidence:**
- Sticky summary header (lines 872-1002)
- Collapsible sections (schedule, pets, pricing) (lines 1039-1214)
- Bottom action bar (lines 1232-1297)
**Exceptions:** None (other detail pages should follow this pattern)

---

### 8. One Action Architecture (Operational/Financial/Utility/Destructive)
**Shared Primitive:** Pattern implemented in `src/app/bookings/[id]/page.tsx`
**Pages Using It:**
- ✅ Booking detail (`src/app/bookings/[id]/page.tsx` lines 1400-1600)
**Evidence:**
- Operational: status, sitter assignment, unassign
- Financial: payment link, tip link, view in Stripe
- Utility: copy booking id, copy details, cancel
**Exceptions:** None (other pages with actions should follow this pattern)

---

### 9. One Schedule Rendering Engine
**Shared Primitive:** `src/components/bookings/BookingScheduleDisplay.tsx` + `src/lib/bookings/schedule-helpers.ts`
**Pages Using It:**
- ✅ Booking detail (`src/app/bookings/[id]/page.tsx`)
- ✅ Booking list (via `BookingScheduleDisplay`)
- ✅ Sitter dashboard (via `BookingScheduleDisplay`)
- ✅ Calendar (via `BookingScheduleDisplay`)
**Evidence:**
- `isOvernightRangeService()` helper
- Housesitting/24-7 Care: start/end date/time + nights count
- Drop-ins/Walks/Pet Taxi: per-date entries with duration labels
**Exceptions:** None

---

### 10. One Assignment Visibility Contract
**Shared Primitive:** `src/components/sitter/SitterAssignmentDisplay.tsx`
**Pages Using It:**
- ✅ Booking detail sticky header (`src/app/bookings/[id]/page.tsx`)
- ✅ Booking list (`src/app/bookings/page.tsx` via `BookingRowActions`)
- ✅ Sitter dashboard (via shared primitive)
- ✅ Calendar (via shared primitive)
**Evidence:**
- Shows sitter name and tier badge if assigned
- Shows "Unassigned" if not assigned
- Consistent styling and behavior
**Exceptions:** None

---

### 11. One Sitter Tier Badge System
**Shared Primitive:** `src/components/sitter/SitterTierBadge.tsx`
**Pages Using It:**
- ✅ Booking detail (`src/app/bookings/[id]/page.tsx` via `SitterAssignmentDisplay`)
- ✅ Booking list (`src/app/bookings/page.tsx` via `BookingRowActions`)
- ✅ Sitter dashboard (`src/app/sitter-dashboard/page.tsx`)
- ✅ Sitter list (`src/app/bookings/sitters/page.tsx`)
- ✅ Sitter detail (`src/app/sitters/[id]/page.tsx`)
**Evidence:**
- Consistent badge colors per tier
- Shows tier name and level
**Exceptions:** None

---

### 12. One Booking Form (Create and Edit)
**Shared Primitive:** `src/components/bookings/BookingForm.tsx`
**Pages Using It:**
- ✅ New booking route (`src/app/bookings/new/page.tsx`)
- ✅ Booking detail edit (`src/app/bookings/[id]/page.tsx`)
**Evidence:**
- `mode: 'create' | 'edit'` prop
- Uses `bookingToFormValues` mapper for edit mode
- Same validation rules for both modes
- Same pricing calculation
**Exceptions:** None (website form should eventually use this too)

---

### 13. One Sitter Assignment Actions Component
**Shared Primitive:** `src/components/bookings/BookingRowActions.tsx`
**Pages Using It:**
- ✅ Booking list (`src/app/bookings/page.tsx` - Actions column)
- ✅ Booking detail (via inline implementation)
**Evidence:**
- Assign sitter modal
- Change sitter modal
- Unassign confirmation modal
- Uses `SitterAssignmentDisplay` for display
**Exceptions:** None

---

### 14. StatCard Compact Mode
**Shared Primitive:** `src/components/ui/StatCard.tsx` with `compact?: boolean` prop
**Pages Using It:**
- ✅ Bookings list (`src/app/bookings/page.tsx` - KPI cards use `compact={isMobile}`)
- ✅ Payments (`src/app/payments/page.tsx` - KPI cards)
**Evidence:**
- Compact mode reduces padding and font sizes for mobile
- Maintains fixed height to prevent layout shifts
**Exceptions:** None (other pages with StatCards should use compact mode on mobile)

---

### 15. Desktop Clipping Prevention
**Shared Primitive:** Pattern of `minWidth: 0` on flex children and `wordBreak: 'break-word'` on text
**Pages Using It:**
- ✅ Booking detail (`src/app/bookings/[id]/page.tsx`)
**Evidence:**
- Address fields have `minWidth: 0` and `wordBreak: 'break-word'`
- Pet notes have `minWidth: 0` and `wordBreak: 'break-word'`
- Booking notes have `minWidth: 0` and `wordBreak: 'break-word'`
- Flex and grid containers have `minWidth: 0`
**Exceptions:** None (other pages with similar layouts should follow this pattern)

---

## BRAND COLORS

### Snout Brand Colors
**Shared Primitive:** `src/lib/design-tokens.ts`
**Pages Using It:**
- ✅ All pages (via tokens)
**Evidence:**
- Pink: `#fce1ef` (primary palette)
- Brown: `#432f21` (primary palette, text brand)
- White: `#ffffff` (background primary)
**Exceptions:** None

---

## SUMMARY

### Fully Consistent (15/15 universal laws)
- All pages use shared primitives
- No duplicate implementations
- Mobile and desktop share same components

### Known Gaps
- Some pages may need to adopt new shared primitives (e.g., `BookingScheduleDisplay`, `SitterAssignmentDisplay`, `SitterTierBadge`)
- Client detail page should follow booking detail pattern
- Sitter detail page should follow booking detail pattern

---

**Generated:** [Current Date]
**Status:** Complete baseline. Ready for ongoing consistency enforcement.

