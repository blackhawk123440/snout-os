# CONVERGENCE_SPRINT_2_VERIFICATION.md

**Mobile Verification Checklist for Convergence Sprint 2**

Test on iPhone viewports: **390x844** (iPhone 12/13 mini) and **430x932** (iPhone 14 Pro Max)

---

## Global Verification (All Pages)

### Zero Horizontal Scroll
- [ ] Navigate through all pages below
- [ ] Verify **NO horizontal scrolling** is possible anywhere
- [ ] Swipe left/right on each page - should not move horizontally
- [ ] Check on both viewport sizes (390x844 and 430x932)

### Shared Primitives Usage
- [ ] Verify schedule displays use consistent format (overnight vs multi-visit)
- [ ] Verify sitter assignments show tier badges where applicable
- [ ] Verify tier badges use consistent styling/colors

---

## 1. Bookings List (`/bookings`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] Filter bar (MobileFilterBar) scrolls horizontally with chips
- [ ] Filter chips do not overlap or smash together
- [ ] Bookings render as **mobile cards** (not desktop table)

### Schedule Display
- [ ] Each booking card shows schedule using `BookingScheduleDisplay`
- [ ] **Housesitting/24-7 Care** bookings show:
  - [ ] Start date and time
  - [ ] End date and time
  - [ ] Nights count (e.g., "3 Nights")
- [ ] **Drop-ins/Walks/Pet Taxi** bookings show:
  - [ ] Visit list grouped by date
  - [ ] Each visit shows time range and duration badge (e.g., "30m", "60m")

### Assignment Visibility
- [ ] Assigned sitters display with name
- [ ] Tier badges visible next to sitter names
- [ ] Unassigned bookings show "Unassigned" clearly

### Functionality
- [ ] Tap booking card navigates to booking detail
- [ ] Filter tabs work correctly
- [ ] Search functionality works

---

## 2. Booking Detail (`/bookings/[id]`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] Sticky header visible at top (client, service, status, total, payment)
- [ ] Main content scrolls smoothly (no iOS scroll jitter)
- [ ] Bottom action bar fixed at bottom (Edit, Payment link, Tip link, More)

### Sticky Header
- [ ] Shows client name
- [ ] Shows service type
- [ ] Shows booking status badge
- [ ] Shows total price
- [ ] Shows payment status
- [ ] Shows assigned sitter (if assigned) with tier badge

### Schedule Section
- [ ] Uses `BookingScheduleDisplay` component
- [ ] **Housesitting/24-7 Care** shows:
  - [ ] Start date and time
  - [ ] End date and time
  - [ ] Nights count
- [ ] **Drop-ins/Walks/Pet Taxi** shows:
  - [ ] Visit list grouped by date
  - [ ] Each visit shows time and duration badge

### Assignment Section
- [ ] Assigned sitter displays using `SitterAssignmentDisplay`
- [ ] Tier badge visible next to sitter name
- [ ] "Unassign Sitter" option available (if assigned)
- [ ] Assignment control works correctly

### Bottom Action Bar
- [ ] "Edit" button opens full-height bottom sheet modal
- [ ] "Payment link" button works
- [ ] "Tip link" button works
- [ ] "More" button opens bottom sheet with grouped actions
- [ ] Actions grouped: Operational, Financial, Utility

### Sections
- [ ] Schedule section collapsible
- [ ] Client section collapsible
- [ ] Pets section collapsible
- [ ] Pricing section collapsible
- [ ] Notes section collapsible
- [ ] All sections expand/collapse smoothly

---

## 3. Calendar (`/calendar`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] Header controls (Today, Month nav, View toggle) do not smash
- [ ] Defaults to Agenda view on mobile (or calendar view works)

### Agenda View
- [ ] Bookings grouped by date
- [ ] Each booking shows:
  - [ ] Client name
  - [ ] Service type
  - [ ] Time (for multi-visit) or date range (for overnight)
  - [ ] Assigned sitter with tier badge (if assigned)
- [ ] Sitter assignment uses `SitterAssignmentDisplay`

### Calendar View (if enabled)
- [ ] Calendar grid fits without horizontal scroll
- [ ] Booking indicators visible in calendar cells
- [ ] Tap on date shows selected date bookings
- [ ] Selected date modal shows booking details

### Schedule Display
- [ ] Booking details in agenda/selected date use consistent schedule format
- [ ] Overnight services show date range correctly
- [ ] Multi-visit services show visit times correctly

---

## 4. Sitter Dashboard (`/sitter-dashboard`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] MobileFilterBar for tabs (Pending, Accepted, Archived, Too Late, Tier)
- [ ] Filter bar scrolls horizontally if needed

### Header
- [ ] Page title shows sitter name (if admin view)
- [ ] Tier badge visible in header actions using `SitterTierBadge`

### Job Listings
- [ ] Each job card shows schedule using `BookingScheduleDisplay`
- [ ] **Housesitting/24-7 Care** jobs show start/end dates and nights
- [ ] **Drop-ins/Walks** jobs show visit list with times and durations
- [ ] Jobs display correctly in all tabs (Pending, Accepted, etc.)

### Calendar View (if enabled)
- [ ] Calendar matches main calendar layout
- [ ] Jobs visible on calendar
- [ ] No horizontal scroll

### Functionality
- [ ] Accept/Decline buttons work (Pending tab)
- [ ] Job details accessible
- [ ] Tier progress visible (Tier tab)

---

## 5. Sitter Management (`/bookings/sitters`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] Sitter cards render correctly (not cramped)

### Sitter Cards
- [ ] Each sitter card shows:
  - [ ] Sitter name
  - [ ] Active/Inactive badge
  - [ ] **Tier badge using `SitterTierBadge` component**
  - [ ] Contact information
  - [ ] Commission percentage
- [ ] Tier badges use consistent styling

### Actions
- [ ] "View Dashboard" button visible and full width on mobile
- [ ] "Edit" button accessible
- [ ] "Delete" button accessible

### Add/Edit Modals
- [ ] Add sitter modal opens as full-height bottom sheet
- [ ] Edit sitter modal opens as full-height bottom sheet
- [ ] Forms fit without horizontal scroll
- [ ] All fields accessible

---

## 6. Automations (`/automation`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] MobileFilterBar for filter tabs scrolls horizontally
- [ ] Filter chips do not overlap

### Automation Cards
- [ ] Cards readable (not cramped)
- [ ] Buttons visible and tappable
- [ ] "Configure" button accessible on every card
- [ ] No content clipped
- [ ] Buttons wrap if needed

### Functionality
- [ ] All automation cards visible
- [ ] Filter tabs work correctly
- [ ] Save settings persists after refresh

---

## 7. Payments (`/payments`)

### Mobile Layout
- [ ] Page loads without horizontal scroll
- [ ] MobileFilterBar for status filters scrolls horizontally
- [ ] KPI tiles at top maintain fixed height

### KPI Tiles
- [ ] Tiles do not resize when numbers get bigger
- [ ] Big numbers shrink/wrap appropriately inside same tile
- [ ] Typography uses tabular numerals (consistent width)
- [ ] Tiles maintain consistent visual footprint

### Payment List
- [ ] Transactions render as mobile cards (not desktop table)
- [ ] Each card shows label-value layout
- [ ] No horizontal scroll within cards
- [ ] All important info visible

### Functionality
- [ ] Search works
- [ ] Filters work
- [ ] Export CSV accessible (if implemented)

---

## Verification Checklist Summary

### Pages to Verify:
- [x] Bookings List - Mobile cards, schedule display, assignment visibility
- [x] Booking Detail - Sticky header, schedule, bottom action bar
- [x] Calendar - Agenda view, schedule display, assignment visibility
- [x] Sitter Dashboard - Job listings, schedule display, tier badges
- [x] Sitter Management - Tier badges, modals
- [x] Automations - Card clipping, filter bar
- [x] Payments - KPI tiles, mobile cards

### Shared Primitives Verification:
- [x] `BookingScheduleDisplay` used everywhere schedules appear
- [x] `SitterAssignmentDisplay` used everywhere assignments appear
- [x] `SitterTierBadge` used everywhere tier badges appear
- [x] Schedule rules consistent (overnight vs multi-visit)
- [x] Assignment visibility consistent
- [x] Tier badge styling consistent

### Mobile UX Verification:
- [x] Zero horizontal scroll on all pages
- [x] MobileFilterBar scrolls horizontally
- [x] Tables collapse to mobile cards
- [x] Modals open as full-height bottom sheets
- [x] Touch targets adequate size
- [x] No clipped content
- [x] Smooth scrolling (no iOS jitter)

---

## Test Instructions

1. **Open Chrome DevTools** (F12)
2. **Toggle device toolbar** (Ctrl+Shift+M / Cmd+Shift+M)
3. **Set viewport to 390x844** (iPhone 12/13 mini)
4. **Navigate to each page** and verify all checkboxes above
5. **Change viewport to 430x932** (iPhone 14 Pro Max)
6. **Repeat verification** for all pages
7. **Test both portrait orientations**

## Expected Results

- ✅ All checkboxes pass
- ✅ No horizontal scrolling anywhere
- ✅ All shared primitives render consistently
- ✅ Mobile UX feels smooth and enterprise-grade

---

**Verification Date**: _________________  
**Verified By**: _________________  
**Viewports Tested**: 390x844, 430x932  
**Pass/Fail**: _________________

