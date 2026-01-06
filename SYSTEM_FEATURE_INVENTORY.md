# System Feature Inventory - Evidence-Based

**Generated**: $(date)  
**Purpose**: Factual inventory of implemented features with exact file paths and line references  
**Method**: Codebase scan with evidence citations

---

## A. Business Systems

### 1. Sitter Tiers System

#### Database Schema
- **Status**: ✅ Implemented
- **File**: `prisma/schema.prisma`
- **Evidence**:
  - `SitterTier` model: Lines 501-518
    - Fields: `name`, `pointTarget`, `minCompletionRate`, `minResponseRate`, `benefits`, `priorityLevel`, `canTakeHouseSits`, `canTakeTwentyFourHourCare`, `isDefault`
  - `SitterTierHistory` model: Lines 520-536
  - `Sitter.currentTierId` relation: Line 111
  - `Sitter.tierHistory` relation: Line 109

#### API Endpoints
- **Status**: ✅ Implemented
- **Files**:
  - `src/app/api/sitter-tiers/route.ts` (GET, POST)
  - `src/app/api/sitter-tiers/[id]/route.ts` (GET, PATCH, DELETE)
  - `src/app/api/sitter-tiers/calculate/route.ts` (POST)
- **Evidence**: API routes exist in directory structure

#### UI Pages
- **Status**: ✅ Implemented
- **File**: `src/app/settings/tiers/page.tsx`
- **Evidence**: 
  - Lines 1-230: Full tier management page
  - Lists tiers: Lines 150-200
  - Delete tier: Lines 63-78
  - Calculate tiers: Lines 80-93
  - Create tier link: Line 109 (links to `/settings/tiers/new` - file not found)

#### Tier Badges Display
- **Status**: ⚠️ Partially Implemented
- **Evidence**:
  - Sitter dashboard shows tier: `src/app/sitter/page.tsx` Lines 289-322
    - Shows tier name: Line 314
    - Shows priority level: Line 317
  - Sitter dashboard (full): `src/app/sitter-dashboard/page.tsx` - tier data fetched but badge display not verified
  - Sitter list page: `src/app/bookings/sitters/page.tsx` - no tier badge found in sitter cards (Lines 259-376)
- **Missing**: Badges not shown in sitter list, bookings list, or everywhere sitter appears

#### Tier Unlocks and Rules
- **Status**: ⚠️ Schema exists, enforcement unclear
- **Evidence**:
  - `benefits` field exists: `prisma/schema.prisma` Line 507 (JSON object)
  - `canTakeHouseSits`, `canTakeTwentyFourHourCare` exist: Lines 509-510
  - Tier calculation API exists: `src/app/api/sitter-tiers/calculate/route.ts`
  - Enforcement logic: Referenced in `src/app/api/bookings/[id]/route.ts` Line 160 (`isSitterEligibleForService`) but file not found
- **Missing**: Clear unlock definitions, why each tier matters, accomplishments required per tier

---

### 2. Bookings Filtering and Sorting

#### Current Implementation
- **Status**: ⚠️ Partially Implemented
- **File**: `src/app/bookings/page.tsx`
- **Evidence**:
  - Single status filter: Lines 59, 98-108
    - Options: `'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'today'`
  - Search term: Lines 60, 111-121
    - Searches: firstName, lastName, phone, email, service
  - Single sort: Lines 61, 124-132
    - Options: `'date' | 'name' | 'price'`
  - Single sitter filter: Found in unsaved version (Line 62 `selectedSitterFilter`), not in saved version
- **Missing**:
  - Multi-select for sitter (only single select exists if any)
  - Multi-select for status (only single select)
  - Date range filter (only "today" exists)
  - Payment status filter
  - Service type filter

#### API Support
- **Status**: ✅ Basic support
- **File**: `src/app/api/bookings/route.ts`
- **Evidence**: Lines 17-36 - Returns all bookings with includes, no filtering params

---

### 3. Booking Detail Payment Actions

#### Send Payment Link Button
- **Status**: ✅ Implemented
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Button: Lines 1277-1281
    ```typescript
    <Button variant="primary" onClick={() => setShowPaymentLinkModal(true)}>
      Create Payment Link
    </Button>
    ```
  - Handler: `handleCreatePaymentLink()` Lines 275-299
  - API call: Line 279 `fetch('/api/payments/create-payment-link')`

#### Payment Link Preview Modal
- **Status**: ✅ Implemented
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Modal: Lines 1808-1960
  - Booking summary: Lines 1825-1857
  - Message preview: Lines 1859-1887
  - Payment link display: Lines 1889-1934
  - Send button: Lines 1954-1955

#### Message Template
- **Status**: ⚠️ Hardcoded (not centralized)
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Line 307: Hardcoded template
    ```typescript
    const message = `💳 PAYMENT REMINDER\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking on ${formatDate(booking.startAt)} is ready for payment.\n\nPets: ${petQuantities}\nTotal: ${formatCurrency(booking.totalPrice)}\n\nPay now: ${paymentLinkUrl}`;
  ```
  - Also in preview: Lines 1882-1885 (same hardcoded template)
- **Missing**: Centralized template location

#### Message Logging
- **Status**: ✅ Implemented
- **File**: `src/lib/message-utils.ts`
- **Evidence**: Lines 54-70 - Creates `Message` record in database

#### Payment Link Reference Storage
- **Status**: ✅ Implemented
- **Evidence**: 
  - `Booking.stripePaymentLinkUrl` field: `prisma/schema.prisma` Line 38
  - API stores link: `src/app/api/payments/create-payment-link/route.ts` (assumed, file exists)

---

### 4. Tip Link Automation

#### Trigger on Completion
- **Status**: ✅ Implemented
- **File**: `src/app/api/bookings/[id]/route.ts`
- **Evidence**: Lines 398-409
  ```typescript
  if (status === "completed" && previousStatusForHistory !== "completed" && finalBooking.sitterId) {
    await enqueueAutomation("tipLink", "client", { bookingId, sitterId }, `tipLink:client:${finalBooking.id}`);
  }
  ```
- **Guard conditions**: 
  - Status must be "completed"
  - Previous status must not be "completed" (transition only)
  - Sitter must be assigned

#### Tip Link Generation
- **Status**: ✅ Implemented
- **File**: `src/lib/automation-executor.ts`
- **Evidence**: Lines 802-826
  - API call: Lines 804-808 `fetch('/api/payments/create-tip-link')`
  - Stores tipLinkUrl: Assumed (Booking.tipLinkUrl field exists)

#### Tip Message Sending
- **Status**: ✅ Implemented
- **File**: `src/lib/automation-executor.ts`
- **Evidence**: Lines 828-845
  - Template: Lines 833-836
  - Send call: Line 845 `await sendMessage(booking.phone, message, booking.id)`

#### Idempotency
- **Status**: ✅ Implemented
- **Evidence**:
  - Idempotency key: `tipLink:client:${bookingId}` (Line 407 in route.ts)
  - Automation queue uses key as jobId: `src/lib/automation-queue.ts` Line 63
  - Guard condition prevents re-trigger: Line 399 `previousStatusForHistory !== "completed"`

#### Tip Calculation Rule
- **Status**: ⚠️ Not explicitly defined
- **Evidence**: Tip link creation API exists but calculation logic not found in executor
- **Missing**: Defined rule for tip amount calculation from booking total

---

### 5. Payment Confirmation Automation

#### Stripe Webhook Handler
- **Status**: ✅ Implemented
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**:
  - Handler: Lines 9-168
  - Event types: `payment_intent.succeeded` (Line 62), `invoice.payment_succeeded` (Line 105)

#### Payment Status Update
- **Status**: ✅ Implemented
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**: Lines 83-90
  ```typescript
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "paid",
      ...(booking.status === "pending" && { status: "confirmed" }),
    },
  });
  ```

#### Booking Confirmed Message
- **Status**: ✅ Implemented
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**: Lines 94-105
  - Triggers automation: `enqueueAutomation("bookingConfirmation", "client", { bookingId }, ...)`
  - Automation executor: `src/lib/automation-executor.ts` handles `bookingConfirmation`

#### Idempotency
- **Status**: ✅ Implemented
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**: Lines 76-80
  ```typescript
  if (booking.paymentStatus === "paid") {
    console.log(`[Webhook] Payment already processed for booking ${bookingId}, skipping`);
    return NextResponse.json({ received: true, message: "Payment already processed" });
  }
  ```
  - Automation idempotency key: Line 104 `bookingConfirmation:client:${bookingId}:payment`

---

### 6. Automations System

#### Database Schema
- **Status**: ✅ Implemented
- **File**: `prisma/schema.prisma`
- **Evidence**: Lines 199-256
  - `Automation` model: Lines 199-214
  - `AutomationCondition` model: Lines 216-227
  - `AutomationAction` model: Lines 229-239
  - `AutomationLog` model: Lines 241-256

#### API Endpoints
- **Status**: ✅ Implemented
- **Files**:
  - `src/app/api/automations/route.ts` (GET, POST)
  - `src/app/api/automations/[id]/route.ts` (GET, PATCH, DELETE)
- **Evidence**: 
  - GET: Lines 8-38 - Returns automations with conditions and actions
  - POST: Lines 44-100 - Creates automation with conditions and actions

#### UI Page
- **Status**: ⚠️ Partially Implemented
- **File**: `src/app/automation/page.tsx`
- **Evidence**:
  - Page exists: Lines 1-831
  - Displays automation configs: Lines 465-577
  - Save button: Lines 349-354
  - **Problem**: Saves to Settings, not Automation model
    - Save handler: Lines 208-238
    - Saves to: `/api/settings` (Line 213)
    - Settings structure: Lines 30-77 (hardcoded automation configs)
- **Missing**:
  - Create new automation from UI
  - Edit automation (only settings-based configs)
  - Delete automation
  - Disable automation (only toggle in settings)
  - Builder UI for trigger, timing, recipients, conditions, message editor
  - Preview functionality
  - Test functionality (test message exists: Line 253, but not for automation builder)

#### Persistence
- **Status**: ⚠️ Partial
- **Evidence**:
  - Settings save persists: `src/app/api/settings/route.ts` (PATCH handler exists)
  - Automation model not used by UI
  - Refresh test: Not verified

---

### 7. Messaging Tab

#### Messages Page
- **Status**: ⚠️ Wrong Implementation
- **File**: `src/app/messages/page.tsx`
- **Evidence**: Lines 1-389
  - **Purpose**: Manages message templates, not conversations
  - Comment: Line 7 "This page manages Message Templates, not conversations"
  - Template CRUD: Lines 78-101

#### Conversation View
- **Status**: ❌ Missing
- **Evidence**: No conversation view found
- **Missing**: 
  - Message list/conversation view
  - Owner sees all messages
  - Sitter sees only their conversations
  - Client/sitter see masked numbers

#### Masked Number Routing
- **Status**: ❌ Missing
- **Evidence**: 
  - OpenPhone integration exists: `src/lib/openphone.ts`
  - Sitter has `openphonePhone` field: `prisma/schema.prisma` Line 105
  - No routing logic found
- **Missing**: Architecture decision and implementation

---

### 8. Payments Page Finance Grade

#### Current Implementation
- **Status**: ⚠️ Partially Implemented
- **File**: `src/app/payments/page.tsx`
- **Evidence**:
  - Page exists: Lines 1-514
  - KPIs calculated: Lines 127-210
    - Total collected: Line 129-131
    - Pending count/amount: Lines 133-139
    - Failed count/amount: Lines 141-147
    - Upcoming payouts: Line 149 (proxy, not real)
  - Filters: Lines 454-485
    - Search: Lines 467-472
    - Status filter: Lines 473-483
  - Table: Lines 487-509
    - Columns: Lines 268-343
    - Shows: Client, Invoice, Amount, Status, Method, Date

#### Missing Features
- **Time Range Compare**: ❌ Missing
  - Current: Time range selector exists (Lines 84-95, 378-386) but no compare view
- **Deep Detail View**: ❌ Missing
  - Table rows not clickable to show payment detail
  - No link to booking
- **CSV Export**: ❌ Missing
  - No export functionality found
- **Reconciliation Friendly**: ⚠️ Partial
  - Table shows basic data
  - Missing: Payment-to-booking linkage in detail view

---

### 9. Admin Login with Google Plus Role System

#### NextAuth Setup
- **Status**: ✅ Implemented
- **File**: `src/app/api/auth/[...nextauth]/route.ts`
- **Evidence**: Lines 1-11
  - Uses handlers from `@/lib/auth`
  - Route exists

#### Google Provider
- **Status**: ⚠️ Unclear
- **Evidence**: 
  - NextAuth route exists
  - Google OAuth config referenced: `src/app/integrations/page.tsx` Line 176 mentions "Google OAuth Client ID"
  - Provider configuration not found in auth route
- **Missing**: Verification of Google provider enabled

#### Role System Schema
- **Status**: ✅ Implemented
- **File**: `prisma/schema.prisma`
- **Evidence**: Lines 463-495
  - `Role` model: Lines 463-471
  - `RolePermission` model: Lines 473-483
  - `UserRole` model: Lines 485-495

#### Role Enforcement
- **Status**: ⚠️ Schema exists, enforcement unclear
- **Evidence**:
  - Permission checks referenced: `src/lib/protected-routes.ts` mentions permission checks
  - `ENABLE_PERMISSION_CHECKS` flag: `src/middleware.ts` Line 22
  - Enforcement logic: Not verified
- **Missing**: 
  - Admin can set role permissions
  - Manager can set abilities for roles below them
  - Permission boundaries enforced

---

### 10. Payroll Automation

#### Commission Percentage
- **Status**: ✅ Implemented
- **File**: `prisma/schema.prisma`
- **Evidence**: Line 100
  - `Sitter.commissionPercentage` field exists (default 80.0)

#### Payroll System
- **Status**: ❌ Missing
- **Evidence**: No payroll models or automation found
- **Missing**:
  - Commission split rules
  - Pay period breakdown
  - Owner approvals
  - Sitter payroll view
  - Payout rail decision (Stripe Connect or other)

---

### 11. Stripe Products and Pricing Mapping Editor

#### Current State
- **Status**: ❌ Missing
- **Evidence**: No editor found for Stripe price IDs
- **Missing**:
  - Edit Stripe price IDs per service
  - Edit base rate per service
  - Changes affect future bookings only
  - Existing bookings keep pricing snapshot (snapshot exists but editor missing)
  - Automations reflect updated prices immediately

---

## B. Mobile Control Surface Requirements

### Global Mobile Rules

#### CSS Rules
- **Status**: ✅ Implemented
- **File**: `src/app/globals.css`
- **Evidence**: Lines 149-247
  - Mobile spacing scale: Lines 151-158
  - Card padding reduction: Lines 160-163
  - Button compact: Lines 165-170
  - Tab bars scrollable: Lines 172-194
  - Modal full height: Lines 196-220
  - Form labels stacked: Lines 222-235

#### Modal Component
- **Status**: ✅ Implemented
- **File**: `src/components/ui/Modal.tsx`
- **Evidence**: Lines 68-106
  - Mobile detection: Line 69 `window.innerWidth < 1024`
  - Full height on mobile: Lines 103-106

---

### Calendar Mobile Fixes

#### Today Button
- **Status**: ✅ Exists
- **File**: `src/app/calendar/page.tsx`
- **Evidence**: Line 422
  ```typescript
  <Button variant="secondary" size="sm" onClick={goToToday}>
    Today
  </Button>
  ```
- **Issue**: Not verified if "smashed" on mobile
- **Container**: Lines 389-425 (month navigation container)

#### Calendar Grid
- **Status**: ✅ Exists
- **File**: `src/app/calendar/page.tsx`
- **Evidence**: Calendar grid rendering exists (Lines 450-1109)
- **Issue**: Not verified if fits screen on mobile

#### Calendar Settings Add Account Modal
- **Status**: ✅ Route exists
- **File**: `src/app/calendar/accounts/page.tsx` (file exists)
- **Evidence**: Link from calendar page: Line 361
- **Issue**: Not verified if modal fits screen (clipping)

---

### Booking Detail Mobile

#### Cards
- **Status**: ✅ Implemented
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**: 
  - CollapsibleCard component: Lines 505-556
  - Cards used: Lines 659, 822, 925, 993
  - Padding: Uses `tokens.spacing[4]` in card content (Line 550)
- **Issue**: Not verified if cards are "giant" on mobile (need manual test)

#### Layout Compactness
- **Status**: ✅ Tab-based layout exists
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**: Lines 1538-1680
  - Tabs: Lines 1547-1680
  - Mobile breakpoint: Line 1542 `'@media (min-width: 1024px)'`

---

### Sitter Management Mobile

#### View Dashboard Button
- **Status**: ✅ Exists
- **File**: `src/app/bookings/sitters/page.tsx`
- **Evidence**: Lines 349-356
  ```typescript
  <Button
    variant="secondary"
    size="sm"
    onClick={() => window.open(`/sitter-dashboard?id=${sitter.id}&admin=true`, '_blank')}
    leftIcon={<i className="fas fa-calendar-alt" />}
  >
    View Dashboard
  </Button>
  ```
- **Issue**: Not verified if cut off on mobile

#### Add Sitter Modal
- **Status**: ✅ Exists
- **File**: `src/app/bookings/sitters/page.tsx`
- **Evidence**: Lines 382-541
  - Modal: Lines 382-541
  - Form fields: Lines 403-520
- **Issue**: Not verified if clips top or bottom on mobile

#### Active Sitter Checkbox Label
- **Status**: ⚠️ Not found
- **Evidence**: No "active sitter" checkbox found in sitter form
- **Note**: Sitter has `active` field in schema but checkbox not found in UI

---

### Sitter Dashboard Mobile

#### Tabs
- **Status**: ✅ Exists
- **File**: `src/app/sitter-dashboard/page.tsx`
- **Evidence**: Lines 245-251, 261-265
  - Tabs: `["pending", "accepted", "archived", "tooLate", "tier"]`
  - TabPanel components exist
- **Issue**: Not verified if tabs have "correct spacing and wrapping" on mobile

---

### Automations Page Mobile

#### Automation Cards
- **Status**: ✅ Exists
- **File**: `src/app/automation/page.tsx`
- **Evidence**: Lines 470-577
  - Card structure: Lines 470-577
  - Configure button: Lines 567-575
- **Issue**: Not verified if cards are "readable" and buttons "visible" on mobile

#### Filter Tabs
- **Status**: ✅ Exists
- **File**: `src/app/automation/page.tsx`
- **Evidence**: Lines 296-302, 435-445
  - Tabs: `["all", "booking", "reminder", "payment", "notification"]`
- **Issue**: Not verified if tabs are "spaced and readable" on mobile

---

### Payments Page Mobile

#### Payment Rows
- **Status**: ✅ Exists
- **File**: `src/app/payments/page.tsx`
- **Evidence**: Lines 268-343 (table columns), 502-507 (table rendering)
- **Issue**: Not verified if rows are "compact and aligned" on mobile

---

### Settings Page Mobile

#### Filter Tabs
- **Status**: ✅ Exists
- **File**: `src/app/settings/page.tsx`
- **Evidence**: Lines 159-164, 183
  - Tabs: `["general", "integrations", "automations", "advanced"]`
  - Icons: Line 160-163 (icons defined)
- **Issue**: Not verified if tabs are "cramped" or icons "aligned properly" on mobile

---

## C. Page Conversions

### Bookings List
- **File**: `src/app/bookings/page.tsx`
- **Size**: ~343 lines
- **Status**: ✅ Converted
- **Evidence**:
  - Uses tokens: Line 25 `import { tokens } from '@/lib/design-tokens'`
  - Uses UI components: Lines 13-23
  - Uses AppShell: Line 24
  - No legacy CSS classes found (only inline styles with tokens)

### Clients
- **File**: `src/app/clients/page.tsx`
- **Status**: ✅ Converted
- **Evidence**: Uses tokens and UI components (grep results show token usage)

### Settings
- **File**: `src/app/settings/page.tsx`
- **Size**: ~400 lines
- **Status**: ✅ Converted
- **Evidence**:
  - Uses tokens: Line 22
  - Uses UI components: Lines 10-20
  - Uses AppShell: Line 21

### Automations
- **File**: `src/app/automation/page.tsx`
- **Size**: ~831 lines
- **Status**: ✅ Converted
- **Evidence**:
  - Uses tokens: Line 28
  - Uses UI components: Lines 13-26
  - Uses AppShell: Line 27

### Calendar
- **File**: `src/app/calendar/page.tsx`
- **Size**: ~1109 lines
- **Status**: ✅ Converted
- **Evidence**: Uses tokens and UI components (grep results)

### Payments
- **File**: `src/app/payments/page.tsx`
- **Size**: ~514 lines
- **Status**: ✅ Converted
- **Evidence**:
  - Uses tokens: Line 26
  - Uses UI components: Lines 13-24
  - Uses AppShell: Line 25

### Booking Detail
- **File**: `src/app/bookings/[id]/page.tsx`
- **Size**: ~2026 lines
- **Status**: ✅ Converted
- **Evidence**:
  - Uses tokens: Line 33
  - Uses UI components: Lines 21-31
  - Uses AppShell: Line 32
  - No legacy CSS (only inline styles with tokens)

---

## Summary

### Fully Implemented
- ✅ Tip link automation (trigger, generation, sending, idempotency)
- ✅ Payment confirmation automation (webhook, status update, message, idempotency)
- ✅ Send payment link button and preview modal
- ✅ Global mobile CSS rules
- ✅ Modal full-height on mobile
- ✅ All major pages converted to design system

### Partially Implemented
- ⚠️ Sitter tiers (schema, API, UI exist, but badges not everywhere, unlocks unclear)
- ⚠️ Bookings filtering (single filters exist, missing multi-select and date range)
- ⚠️ Automations (model and API exist, but UI saves to settings not model, no builder)
- ⚠️ Payments page (basic exists, missing compare, exports, deep detail)
- ⚠️ Auth/Roles (schema exists, enforcement unclear, Google login unclear)

### Missing
- ❌ Messaging tab with conversations and masked numbers
- ❌ Payroll automation
- ❌ Stripe price mapping editor
- ❌ Multi-filter bookings list
- ❌ Mobile UI verification (all issues need manual testing)

---

## Mobile Issues Requiring Manual Verification

All mobile issues listed in spec require manual testing on actual devices (390x844 and 430x932 viewports):

1. Calendar today button smashed
2. Calendar add account modal clipping
3. Booking detail cards too giant
4. Sitter management view dashboard cut off
5. Sitter management add sitter modal clipping
6. Sitter dashboard tabs cramped
7. Automations cards unreadable
8. Automations filter tabs cramped
9. Payments rows too large
10. Settings filter tabs cramped
11. Settings icon alignment

**Note**: CSS rules exist in `globals.css` but need verification they solve all issues.

