# SYSTEM FEATURE INVENTORY
## Snout OS Dashboard - Complete Feature Status

**Last Updated:** Generated from codebase analysis
**Master Prompt Reference:** See `MASTER_PROMPT.md`

---

## UNIVERSAL UI LAWS (GLOBAL)

### ✅ Zero Horizontal Scroll on Mobile
**Status:** Implemented
**Evidence:**
- `src/app/layout.tsx`: Global `overflow-x: hidden` on html, body, `#__next`
- `src/components/layout/AppShell.tsx`: `maxWidth: '100vw'`, `overflowX: 'hidden'` on main
- `src/components/ui/Table.tsx`: Mobile card layout enforces `overflowX: 'hidden'` (line 64)
**Files:** `src/app/layout.tsx`, `src/components/layout/AppShell.tsx`, `src/components/ui/Table.tsx`

### ✅ Buttons Must Look Like Buttons (44px minimum)
**Status:** Implemented
**Evidence:**
- `src/components/ui/Button.tsx`: `getSizeStyles` sets explicit `height` for each size
- Touch targets meet 44px minimum
**Files:** `src/components/ui/Button.tsx`

### ✅ One Mobile Spacing Scale (Tokens Only)
**Status:** Implemented
**Evidence:**
- `src/lib/design-tokens.ts`: Centralized spacing system
- All components use `tokens.spacing`
**Files:** `src/lib/design-tokens.ts`

### ✅ One Modal Behavior (Full-Height Bottom Sheets on Mobile)
**Status:** Implemented
**Evidence:**
- `src/components/ui/Modal.tsx`: Lines 73-218 implement full-height bottom sheet on mobile
- `maxHeight: '90vh'`, `height: '90vh'`, proper scrolling
**Files:** `src/components/ui/Modal.tsx`

### ✅ One Table → Mobile Card Pattern
**Status:** Implemented
**Evidence:**
- `src/components/ui/Table.tsx`: Mobile card layout implemented (lines 48-169)
- Requires `mobileLabel` and `mobileOrder`
- `src/app/bookings/page.tsx`: All 6 columns have `mobileLabel` and `mobileOrder` (lines 280-373)
- `src/app/clients/page.tsx`: All 5 columns have `mobileLabel` and `mobileOrder` (lines 107-169)
- `src/app/payments/page.tsx`: All 6 columns have `mobileLabel` and `mobileOrder` (lines 275-351)
**Files:** `src/components/ui/Table.tsx`, `src/app/bookings/page.tsx`, `src/app/clients/page.tsx`, `src/app/payments/page.tsx`

### ✅ One Filter System (MobileFilterBar)
**Status:** Implemented
**Evidence:**
- `src/components/ui/MobileFilterBar.tsx`: Reusable component created
- Used in:
  - `src/app/bookings/page.tsx` (lines 422-437)
  - `src/app/payments/page.tsx` (status filter)
  - `src/app/payroll/page.tsx` (status filter)
  - `src/app/automation/page.tsx` (category filter)
  - `src/app/messages/page.tsx` (Conversations/Templates tabs)
  - `src/app/sitter/page.tsx` (6 tabs)
  - `src/app/sitter-dashboard/page.tsx` (5 tabs)
  - `src/app/settings/page.tsx` (4 tabs)
  - `src/app/settings/automations/ledger/page.tsx` (status and type filters)
**Files:** `src/components/ui/MobileFilterBar.tsx`, multiple page files

### ✅ One Detail Page Pattern (Sticky Header, Collapsible Sections, Bottom Action Bar)
**Status:** Implemented
**Evidence:**
- `src/app/bookings/[id]/page.tsx`: 
  - Sticky summary header (lines 872-1002)
  - Collapsible sections (schedule, pets, pricing) (lines 1039-1214)
  - Bottom action bar (lines 1232-1297)
**Files:** `src/app/bookings/[id]/page.tsx`

### ✅ One Action Architecture (Operational/Financial/Utility/Destructive)
**Status:** Implemented
**Evidence:**
- `src/app/bookings/[id]/page.tsx`: "More Actions" modal groups actions (lines 1400-1600)
  - Operational: status, sitter assignment, unassign
  - Financial: payment link, tip link, view in Stripe
  - Utility: copy booking id, copy details, cancel
**Files:** `src/app/bookings/[id]/page.tsx`

### ✅ One Schedule Rendering Engine
**Status:** Implemented
**Evidence:**
- `src/app/bookings/[id]/page.tsx`: Lines 37-39, 1063-1129
  - `isOvernightRangeService()` helper
  - Housesitting/24-7 Care: start/end date/time + nights count
  - Drop-ins/Walks/Pet Taxi: per-date entries with duration labels
- Used in booking detail page
**Files:** `src/app/bookings/[id]/page.tsx`
**Note:** ⚠️ Partially used - should be shared primitive used everywhere (booking list, sitter dashboard, sitter calendar)

### ⚠️ One Assignment Visibility Contract
**Status:** Partial
**Evidence:**
- **Booking detail:** Sitter shown in sticky header (lines 976-1000) ✅
- **Booking list:** Sitter column with `mobileLabel` and `mobileOrder: 6` (line 342) ✅
- **Unassign:** "Unassign Sitter" in More Actions (lines 1400-1600) ✅
- **Sitter dashboard:** ⚠️ Needs verification - assigned bookings should be visible
- **Sitter calendar:** ❌ Not verified - should show assigned bookings
- **Payroll:** ❌ Assignment not visible in payroll
- **Automations:** ❌ Assignment not visible in automations
**Files:** `src/app/bookings/[id]/page.tsx`, `src/app/bookings/page.tsx`

---

## BOOKINGS

### ✅ Full Lifecycle States
**Status:** Implemented
**Evidence:**
- Status values: `pending`, `confirmed`, `completed`, `cancelled`
- Status filtering on bookings page
- Status badges throughout
**Files:** `src/app/bookings/page.tsx`, `src/app/bookings/[id]/page.tsx`

### ✅ Edit Booking on Mobile
**Status:** Implemented
**Evidence:**
- `EditBookingModal` component exists
- Accessible via bottom action bar "Edit" button (line 1251)
- Opens as full-height bottom sheet (Modal component handles this)
**Files:** `src/app/bookings/[id]/page.tsx`, `src/components/booking/EditBookingModal.tsx`

### ✅ Correct Schedule Display Per Service
**Status:** Implemented
**Evidence:**
- `isOvernightRangeService()` helper (lines 37-39)
- Overnight services show start/end date/time + nights (lines 1063-1092)
- Multi-visit services show per-date entries with duration (lines 1094-1129)
**Files:** `src/app/bookings/[id]/page.tsx`

### ✅ Payment + Tip Actions
**Status:** Implemented
**Evidence:**
- Payment link modal (lines 1984-2041)
- Tip link modal (lines 2042-2099)
- Confirmation modals with message preview (lines 2265-2393)
- Generate payment/tip link API endpoints
**Files:** `src/app/bookings/[id]/page.tsx`, `src/app/api/payments/create-payment-link/route.ts`, `src/app/api/bookings/[id]/tip-link/route.ts`

### ⚠️ Assignment Management
**Status:** Partial
**Evidence:**
- Assign sitter: ✅ Exists in More Actions modal
- Unassign sitter: ✅ Exists in More Actions modal with confirmation
- Reassign: ❌ Not verified - may need to assign different sitter to reassign
- Assignment visible in booking detail sticky header: ✅
- Assignment visible in booking list: ✅
**Files:** `src/app/bookings/[id]/page.tsx`, `src/app/api/bookings/[id]/route.ts`

### ✅ Zero Horizontal Scroll
**Status:** Implemented
**Evidence:**
- Table uses mobile card layout
- All columns have `mobileLabel` and `mobileOrder`
- Global overflow-x prevention
**Files:** `src/app/bookings/page.tsx`, `src/components/ui/Table.tsx`

---

## CALENDAR

### ⚠️ Proper Mobile Calendar Layout
**Status:** Partial
**Evidence:**
- `src/app/calendar/page.tsx`: Defaults to Agenda view on mobile (lines 78-85) ✅
- Month view exists but mobile layout not fully verified
**Files:** `src/app/calendar/page.tsx`

### ⚠️ Agenda and Month Views Readable
**Status:** Partial
**Evidence:**
- Agenda view exists
- Month view exists
- Mobile responsiveness needs verification
**Files:** `src/app/calendar/page.tsx`

### ✅ Sitter Filtering
**Status:** Implemented
**Evidence:**
- `selectedSitterFilter` state (line 72)
- Sitter dropdown filter exists
**Files:** `src/app/calendar/page.tsx`

### ⚠️ Consistent Date Controls
**Status:** Partial
**Evidence:**
- Date navigation exists
- Consistency across calendar page needs verification
**Files:** `src/app/calendar/page.tsx`

### ⚠️ Schedule Display Rules Applied
**Status:** Partial
**Evidence:**
- Calendar page handles Housesitting/24-7 Care range services (lines 169, 681-682)
- Multi-visit services handled
- But uses different logic than booking detail - should use shared schedule renderer
**Files:** `src/app/calendar/page.tsx`

---

## CLIENTS

### ✅ No Horizontal Scroll
**Status:** Implemented
**Evidence:**
- Table uses mobile card layout
- All columns have `mobileLabel` and `mobileOrder`
**Files:** `src/app/clients/page.tsx`

### ✅ Mobile Card Layout
**Status:** Implemented
**Evidence:**
- Table component renders cards on mobile
- All 5 columns have proper `mobileLabel` and `mobileOrder`
**Files:** `src/app/clients/page.tsx`

### ❌ Booking History
**Status:** Missing
**Evidence:**
- Clients page shows `totalBookings` and `lastBooking` in table
- No dedicated booking history section or page
- No link to view all bookings for a client
**Files:** `src/app/clients/page.tsx`

### ❌ Payment Visibility
**Status:** Missing
**Evidence:**
- Clients page shows booking count and last booking date
- No payment status, total paid, or payment history visible
**Files:** `src/app/clients/page.tsx`

---

## SITTERS

### ⚠️ Tier System with Visible Badges
**Status:** Partial
**Evidence:**
- Tier system exists in schema (`currentTierId`, `currentTier` relation)
- Sitter dashboard shows tier progress (lines 534-621 in `src/app/sitter/page.tsx`) ✅
- Tier badges NOT visible on:
  - Sitter list page (`src/app/bookings/sitters/page.tsx`) ❌
  - Booking detail page sitter assignment ❌
  - Calendar sitter filter ❌
**Files:** `src/app/sitter/page.tsx`, `src/app/bookings/sitters/page.tsx`, `prisma/schema.prisma`

### ✅ Commission Visibility
**Status:** Implemented
**Evidence:**
- Commission percentage shown on sitter list (line 382 in `src/app/bookings/sitters/page.tsx`)
- Sitter dashboard shows earnings calculations
**Files:** `src/app/bookings/sitters/page.tsx`, `src/app/sitter/page.tsx`

### ⚠️ Assignment Visibility
**Status:** Partial
**Evidence:**
- Assignment visible in booking detail ✅
- Assignment visible in booking list ✅
- Assignment visible in sitter dashboard: ⚠️ Needs verification
- Assignment visible in sitter calendar: ❌ Not verified
**Files:** `src/app/bookings/[id]/page.tsx`, `src/app/bookings/page.tsx`

### ⚠️ Sitter Dashboard with Real Calendar Layout
**Status:** Partial
**Evidence:**
- `src/app/sitter/page.tsx`: Sitter dashboard exists with tabs
- Calendar layout not verified to match main calendar page
- Should use shared schedule renderer for booking display
**Files:** `src/app/sitter/page.tsx`, `src/app/sitter-dashboard/page.tsx`

---

## AUTOMATIONS

### ✅ Fully Visible Cards on Mobile
**Status:** Implemented
**Evidence:**
- `src/app/automation/page.tsx`: Cards use `overflow: 'visible'` (line 362)
- Buttons wrap and become full width on mobile
- Descriptions clamp with "Configure" action
**Files:** `src/app/automation/page.tsx`

### ✅ No Clipped Actions
**Status:** Implemented
**Evidence:**
- Cards have `overflow: 'visible'` (line 362)
- Buttons wrap properly on mobile
**Files:** `src/app/automation/page.tsx`

### ✅ Editable Automations
**Status:** Implemented
**Evidence:**
- Expandable automation cards with "Configure" button
- Settings can be edited per automation
**Files:** `src/app/automation/page.tsx`

### ✅ Persistent Settings
**Status:** Implemented
**Evidence:**
- Settings API exists (`src/app/api/settings/route.ts`)
- Settings persisted to database
**Files:** `src/app/api/settings/route.ts`, `src/app/automation/page.tsx`

### ✅ MobileFilterBar Integration
**Status:** Implemented
**Evidence:**
- Category filter uses `MobileFilterBar` on mobile
- Horizontal scrolling chips
**Files:** `src/app/automation/page.tsx`

---

## PAYMENTS

### ⚠️ Stripe Truth Parity
**Status:** Partial
**Evidence:**
- `src/app/payments/page.tsx`: Uses `/api/stripe/analytics` endpoint
- Shows: totalRevenue, recentPayments, monthlyRevenue
- ❌ Missing: One-off payments, invoices, PaymentIntents, Charges, Refunds, Disputes, Payouts, Fees, Net revenue
- ❌ Missing: Reconciliation status ("matches Stripe" or "out of sync")
**Files:** `src/app/payments/page.tsx`, `src/app/api/stripe/analytics/route.ts`

### ❌ One-Off Jobs + Subscriptions
**Status:** Missing
**Evidence:**
- Payments page only shows subscription-style payments
- No distinction between one-off jobs and subscriptions
**Files:** `src/app/payments/page.tsx`

### ❌ All Historical Payments
**Status:** Missing
**Evidence:**
- Shows recent payments only
- No comprehensive historical payment list
- Missing refunds, disputes, failed payments breakdown
**Files:** `src/app/payments/page.tsx`

### ⚠️ Charts, Graphs, Comparisons
**Status:** Partial
**Evidence:**
- Revenue chart mentioned in interface but not implemented
- No breakdown by service type
- No breakdown by client
- No pending vs paid vs failed chart
- No refunds/disputes section
**Files:** `src/app/payments/page.tsx`

### ❌ Revenue Must Match Stripe Exactly
**Status:** Missing
**Evidence:**
- No reconciliation logic
- No comparison with Stripe totals
- No "matches Stripe" indicator
**Files:** `src/app/payments/page.tsx`

### ✅ Export CSV
**Status:** Missing
**Evidence:**
- Not found in payments page
**Files:** `src/app/payments/page.tsx`

### ✅ Mobile Card Layout
**Status:** Implemented
**Evidence:**
- Table uses mobile card layout
- All columns have `mobileLabel` and `mobileOrder`
**Files:** `src/app/payments/page.tsx`

---

## PAYROLL

### ⚠️ Enterprise-Grade Payroll UI
**Status:** Partial
**Evidence:**
- `src/app/payroll/page.tsx`: Basic payroll page exists
- Pay periods structure exists
- UI needs verification for enterprise-grade feel
**Files:** `src/app/payroll/page.tsx`

### ⚠️ Pay Periods
**Status:** Partial
**Evidence:**
- PayPeriod interface exists (lines 35-51)
- Pay period filtering exists
- ❌ Auto-generated pay periods (weekly/biweekly) not verified
**Files:** `src/app/payroll/page.tsx`

### ✅ Earnings Breakdown
**Status:** Implemented
**Evidence:**
- BookingEarning interface exists (lines 53-61)
- Per sitter earnings breakdown exists
**Files:** `src/app/payroll/page.tsx`

### ❌ Adjustments, Bonuses, Deductions
**Status:** Missing
**Evidence:**
- No adjustment fields in PayPeriod interface
- No bonuses/deductions logic
**Files:** `src/app/payroll/page.tsx`

### ⚠️ Approval Workflow
**Status:** Partial
**Evidence:**
- Approval modal exists (`showApprovalModal` state, line 69)
- `handleViewDetails` function exists
- Status includes 'approved' (line 41)
- ❌ Approval workflow not fully implemented
**Files:** `src/app/payroll/page.tsx`

### ❌ Export CSV
**Status:** Missing
**Evidence:**
- Not found in payroll page
**Files:** `src/app/payroll/page.tsx`

### ❌ Audit Log
**Status:** Missing
**Evidence:**
- No audit log tracking changes to payroll
**Files:** `src/app/payroll/page.tsx`

### ⚠️ Payout Status Tracking
**Status:** Partial
**Evidence:**
- PayPeriod interface has `paidAt` field (line 49)
- Status includes 'paid' (line 41)
- ❌ Payout status tracking not fully implemented
**Files:** `src/app/payroll/page.tsx`

### ✅ MobileFilterBar Integration
**Status:** Implemented
**Evidence:**
- Status filter uses `MobileFilterBar` on mobile
**Files:** `src/app/payroll/page.tsx`

---

## MESSAGING

### ✅ Template Management
**Status:** Implemented
**Evidence:**
- Messages page exists with Templates tab
- Template management functionality exists
**Files:** `src/app/messages/page.tsx`

### ✅ Automation Integration
**Status:** Implemented
**Evidence:**
- Automation worker exists (`src/worker/automation-worker.ts`)
- SMS templates exist (`src/lib/sms-templates.ts`)
- Automations use message templates
**Files:** `src/app/messages/page.tsx`, `src/worker/automation-worker.ts`, `src/lib/sms-templates.ts`

### ✅ Masked Numbers via OpenPhone
**Status:** Implemented
**Evidence:**
- OpenPhone integration exists (`src/lib/openphone.ts`)
- Sitter model has `openphonePhone` field
- Phone type selection exists (personal vs OpenPhone)
**Files:** `src/lib/openphone.ts`, `prisma/schema.prisma`, `src/app/bookings/sitters/page.tsx`

### ✅ Conversation Visibility
**Status:** Implemented
**Evidence:**
- Messages page has Conversations tab
- Messages API exists
**Files:** `src/app/messages/page.tsx`

### ✅ MobileFilterBar Integration
**Status:** Implemented
**Evidence:**
- Conversations/Templates tabs use `MobileFilterBar` on mobile
**Files:** `src/app/messages/page.tsx`

---

## SUMMARY

### ✅ Fully Implemented (18 features)
- Zero horizontal scroll on mobile
- Buttons (44px minimum)
- One mobile spacing scale
- One modal behavior
- One table → mobile card pattern
- One filter system (MobileFilterBar)
- One detail page pattern
- One action architecture
- Bookings: Full lifecycle states, Edit on mobile, Schedule display, Payment/Tip actions, Zero horizontal scroll
- Automations: Fully visible cards, No clipped actions, Editable, Persistent settings, MobileFilterBar
- Messaging: Template management, Automation integration, OpenPhone, Conversation visibility, MobileFilterBar

### ⚠️ Partially Implemented (15 features)
- One schedule rendering engine (exists but not shared everywhere)
- One assignment visibility contract (missing in some places)
- Assignment management (reassign not verified)
- Calendar: Mobile layout, Views readable, Date controls, Schedule display rules
- Sitters: Tier badges (not everywhere), Assignment visibility, Dashboard calendar layout
- Payments: Stripe truth (incomplete), Charts/graphs (partial)
- Payroll: Enterprise UI, Pay periods (not auto-generated), Approval workflow, Payout status tracking

### ❌ Missing (11 features)
- Clients: Booking history, Payment visibility
- Payments: One-off jobs + subscriptions, All historical payments, Revenue match Stripe exactly, Export CSV, Reconciliation status
- Payroll: Adjustments/Bonuses/Deductions, Export CSV, Audit log

---

## NEXT STEPS

1. **Create shared schedule rendering primitive** - Extract `isOvernightRangeService()` and schedule display logic into shared utility
2. **Complete assignment visibility** - Ensure sitter assignment visible in sitter dashboard, sitter calendar, payroll, automations
3. **Implement tier badge visibility** - Add tier badges to sitter list, booking detail, calendar
4. **Build Stripe truth parity** - Ingest all Stripe payment types, add reconciliation, export CSV
5. **Complete payroll features** - Auto-generate pay periods, add adjustments/bonuses/deductions, audit log, export CSV
6. **Add client booking history** - Link to view all bookings for a client, show payment history

---

**Generated:** [Current Date]
**Status:** Baseline inventory complete. Ready for feature completion planning.

