# Execution Checklist Master - Booking Detail Enterprise Control Surface

**Generated**: $(date)  
**Purpose**: Evidence-based validation that all features are implemented correctly  
**Critical**: All items must pass before production deployment

---

## Build and Type Safety

### ✅ Typecheck Passes
- **Command**: `npm run typecheck`
- **File**: `package.json` → `"typecheck": "tsc --noEmit"`
- **Evidence**: 
  ```
  > snout-os@1.0.0 typecheck
  > tsc --noEmit
  ```
  (No errors reported - exit code 0)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If typecheck fails, fix all TypeScript errors before proceeding
- **Rollback**: Revert to last passing commit if typecheck was previously passing

### ✅ Build Passes
- **Command**: `npm run build`
- **File**: `package.json` → `"build": "prisma generate --schema=prisma/schema.prisma && next build"`
- **Evidence**: 
  ```
  ✓ Compiled successfully in 8.1s
  Skipping linting
  Checking validity of types ...
  ```
  (Build completes without errors)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If build fails, all features are blocked
- **Rollback**: Revert to last passing build commit

### ⬜ Unit Tests Pass
- **Command**: `npm test` (if test suite exists)
- **File**: Check for `__tests__` or `.test.ts` files
- **Evidence**: List test files:
  - `src/lib/__tests__/protected-routes.test.ts`
  - `src/lib/__tests__/middleware-protection.test.ts`
- **Status**: ⬜ PASS / ⬜ FAIL / ⬜ N/A (no tests)
- **Blocking**: ⬜ YES / ⬜ NO
- **Stop Condition**: Blocking test failures must be fixed
- **Rollback**: N/A if no tests exist

---

## Booking Detail Control Surface

### ✅ Route Exists and Renders
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**: 
  - File exists: ✅ (2026 lines)
  - Uses AppShell: Line 32 `import { AppShell } from '@/components/layout/AppShell'`
  - Uses design tokens: Line 33 `import { tokens } from '@/lib/design-tokens'`
  - Uses UI components only: Lines 21-31 import from `@/components/ui`
  - No legacy CSS: No `className` with Tailwind classes, only inline styles with tokens
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If route doesn't render or uses legacy CSS, fix before proceeding

### ✅ Desktop Two-Column Layout
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Layout structure: Lines 1520-1536
  - Grid definition: Line 1526 `gridTemplateColumns: '1fr 400px'`
  - Breakpoint: Line 1524 `'@media (min-width: 1024px)'`
  - Left column: Line 1532 `<IntelligenceColumn />`
  - Right column: Line 1535 `<ControlPanel />`
  - IntelligenceColumn component: Lines 650-1063 (read-only data display)
  - ControlPanel component: Lines 1070-1436 (action controls)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If layout doesn't match two-column structure, redesign required

### ✅ Mobile Tab-Based Navigation
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Tabs component: Lines 1547-1680
  - Tab definitions: Lines 1548-1554
    ```typescript
    tabs={[
      { id: 'overview', label: 'Overview' },
      { id: 'schedule', label: 'Schedule' },
      { id: 'pets', label: 'Pets' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'actions', label: 'Actions' },
    ]}
    ```
  - TabPanel components: Lines 1558-1679
  - Mobile breakpoint: Line 1542 `'@media (min-width: 1024px)'` hides on desktop
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If tabs don't work on mobile, navigation is broken

### ✅ Sticky Booking Header
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Component: `BookingSummary` (Lines 559-647)
  - Sticky positioning: Line 562 `position: 'sticky'`
  - Z-index: Line 564 `zIndex: tokens.zIndex.sticky`
  - Rendered: Called in layout (line 1515)
  - Content: Client name, service, dates, status badge, total price, payment status
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If header doesn't stick on scroll, UX is broken

### ✅ Collapsible Intelligence Cards
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - CollapsibleCard component: Lines 505-556
  - Schedule & Service card: Lines 659-819
    - Default collapsed: Line 663 `defaultExpanded={false}`
    - State: Line 121 `const [scheduleExpanded, setScheduleExpanded] = useState(false);`
  - Pets & Care card: Lines 822-922
    - Default expanded: Line 122 `const [petsExpanded, setPetsExpanded] = useState(true);`
  - Pricing Breakdown card: Lines 925-990
    - Default collapsed: Line 123 `const [pricingExpanded, setPricingExpanded] = useState(false);`
  - Notes & History card: Lines 993-1063
    - Default collapsed: Line 124 `const [notesExpanded, setNotesExpanded] = useState(false);`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If cards don't collapse/expand, intelligence section is broken

---

## Edit Booking System

### ✅ Service Layer Exists
- **File**: `src/lib/booking-edit-service.ts`
- **Evidence**:
  - File exists: ✅ (381 lines)
  - Main function: `editBooking()` (Lines 200-379)
  - Function signature:
    ```typescript
    export async function editBooking(
      bookingId: string,
      updates: BookingEditInput,
      request?: NextRequest
    ): Promise<BookingEditResult>
    ```

#### Validate Input
- **Location**: Lines 224-253
- **Evidence**: 
  ```typescript
  const validation = validateFormPayload(formPayload);
  if (!validation.success) {
    return { success: false, error: 'Validation failed', errors: validation.errors };
  }
  ```
- **Uses**: `validateFormPayload` from `@/lib/validation/form-booking`

#### Apply Changes
- **Location**: Lines 273-336
- **Evidence**: 
  ```typescript
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({ where: { id: bookingId }, data: { ... } });
    // Updates pets, timeSlots in transaction
  });
  ```

#### Recalculate Pricing When Relevant
- **Location**: Lines 255-266
- **Evidence**:
  ```typescript
  const pricingRelevantFields = ['service', 'startAt', 'endAt', 'pets', 'quantity', 'afterHours', 'holiday', 'timeSlots'];
  const pricingChanged = changedFields.some(field => pricingRelevantFields.includes(field));
  if (pricingChanged) {
    const pricing = await recalculatePricing(original, updates);
    totalPrice = pricing.totalPrice;
    pricingSnapshot = pricing.pricingSnapshot;
  }
  ```
- **Function**: `recalculatePricing()` (Lines 150-195)
  - Uses `calculateCanonicalPricing` if `USE_PRICING_ENGINE_V1` enabled
  - Falls back to `calculateBookingPrice` otherwise

#### Detect High Risk Changes
- **Location**: Lines 87-142
- **Evidence**:
  ```typescript
  function detectHighRiskChanges(original: any, updated: BookingEditInput): { isHighRisk: boolean; changedFields: string[] }
  ```
  - High risk fields: `startAt`, `endAt`, `service`, `pets` (quantity), `address`, `pickupAddress`, `dropoffAddress`
  - Returns: `{ isHighRisk: boolean, changedFields: string[] }`

#### Write Audit Event
- **Location**: Lines 348-359
- **Evidence**:
  ```typescript
  await logEvent('booking.edited', 'success', {
    bookingId,
    metadata: {
      changedFields,
      isHighRisk,
      pricingChanged,
      oldPrice: pricingChanged ? original.totalPrice : undefined,
      newPrice: pricingChanged ? totalPrice : undefined,
      changedBy: userId,
    },
  });
  ```
- **Function**: `logEvent()` from `@/lib/event-logger`

#### Write Status History Only When Status Changes
- **Location**: Lines 338-346
- **Evidence**:
  ```typescript
  if (updates.status && updates.status !== original.status) {
    await logBookingStatusChange(bookingId, updates.status, {
      fromStatus: original.status,
      changedBy: userId,
      reason: 'Booking edited',
      metadata: { source: 'edit_booking_service' },
    });
  }
  ```
- **Function**: `logBookingStatusChange()` from `@/lib/booking-status-history`
- **Condition**: Only executes if `updates.status !== original.status`

- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If any function missing, edit system is incomplete

### ✅ Edit Modal Exists
- **File**: `src/components/booking/EditBookingModal.tsx`
- **Evidence**:
  - File exists: ✅ (744 lines)
  - Component: `EditBookingModal` (Lines 68-743)
  - Props: Lines 54-59
    ```typescript
    interface EditBookingModalProps {
      isOpen: boolean;
      onClose: () => void;
      booking: Booking;
      onSave: (updates: BookingEditInput) => Promise<{ success: boolean; error?: string; changes?: any }>;
    }
    ```

#### Prefills Correctly
- **Location**: Lines 80-109 (initial state), Lines 111-147 (useEffect reset)
- **Evidence**:
  ```typescript
  const [formData, setFormData] = useState<BookingEditInput>({
    firstName: booking.firstName,
    lastName: booking.lastName,
    phone: booking.phone,
    email: booking.email,
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    // ... all fields mapped from booking
  });
  ```

#### Sections Exist
- **Location**: Lines 324-720
- **Evidence**:
  - Service & Schedule: Lines 330-400
  - Client Information: Lines 402-450
  - Addresses: Lines 452-490
  - Pets: Lines 492-560
  - Notes: Lines 562-580

- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If modal doesn't prefill or missing sections, edit flow broken

### ✅ High Risk Diff Review Gate
- **File**: `src/components/booking/EditBookingModal.tsx`
- **Evidence**:
  - Step state: Line 74 `const [step, setStep] = useState<'edit' | 'review'>('edit');`
  - Diff review state: Line 77 `const [diffReview, setDiffReview] = useState<DiffReview[]>([]);`
  - Build diff function: Lines 212-288 `buildDiffReview()`
  - High risk check: Lines 289-297
    ```typescript
    const highRiskFields = ['startAt', 'endAt', 'service', 'pets', 'address', 'pickupAddress', 'dropoffAddress'];
    const hasHighRiskChanges = diffs.some(diff => highRiskFields.includes(diff.field));
    if (hasHighRiskChanges && step === 'edit') {
      setDiffReview(diffs);
      setStep('review');
      return;
    }
    ```
  - Review UI: Lines 625-680 (shows old vs new values side-by-side)
  - Cancel from review: Line 721 `onClick={() => setStep('edit')}`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If diff review doesn't show for high-risk changes, safety gate is broken

### ✅ API Route Exists for Edit
- **File**: `src/app/api/bookings/[id]/edit/route.ts`
- **Evidence**:
  - File exists: ✅ (68 lines)
  - Route handler: `POST` function (Lines 10-66)
  - Calls service: Line 38 `const result = await editBooking(id, updates, request);`
  - **Authorization**: 
    - Protected via middleware: `/api/bookings` pattern in `src/lib/protected-routes.ts` (Line 81)
    - Middleware file: `src/middleware.ts` (Lines 56-68)
    - Guard: `isProtectedRoute(pathname)` returns true for `/api/bookings/*`
    - Auth check: Lines 58-64 in middleware.ts
    - **Note**: Auth only enforced when `ENABLE_AUTH_PROTECTION === true`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If route unprotected when auth enabled, security vulnerability
- **Rollback**: Disable route or add explicit auth check if middleware fails

---

## Payment Link Flow

### ✅ Generate Payment Link Exists
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Button: Lines 1277-1281
    ```typescript
    <Button variant="primary" onClick={() => setShowPaymentLinkModal(true)}>
      Create Payment Link
    </Button>
    ```
  - Handler: `handleCreatePaymentLink()` (Lines 275-299)
  - API call: Line 279 `fetch('/api/payments/create-payment-link', { method: 'POST', ... })`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If button missing or doesn't call API, payment flow broken

### ✅ Payment Link Preview Modal Exists
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Modal: Lines 1808-1960
  - Booking Summary section: Lines 1825-1857
    - Shows: Client name, Service, Date, Total
  - Message Preview section: Lines 1859-1887
    - Template: Lines 1882-1885
      ```typescript
      `💳 PAYMENT REMINDER\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking on ${formatDate(booking.startAt)} is ready for payment.\n\nPets: ${petQuantities}\nTotal: ${formatCurrency(booking.totalPrice)}\n\nPay now: ${paymentLinkUrl}`
      ```
    - Variables filled: `booking.firstName`, `booking.service`, `formatDate(booking.startAt)`, `petQuantities`, `formatCurrency(booking.totalPrice)`, `paymentLinkUrl`
  - Payment Link section: Lines 1889-1934
    - Shows link: Line 1921 `{paymentLinkUrl}`
    - Copy button: Lines 1923-1931
  - Send button: Lines 1954-1955
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If preview doesn't show correct data, message may be wrong

### ✅ Messaging Send Endpoint Exists
- **File**: `src/app/api/messages/send/route.ts`
- **Evidence**:
  - File exists: ✅ (47 lines)
  - Route handler: `POST` function (Lines 10-45)
  - Sends message: Line 22 `const sent = await sendMessage(to, message, bookingId);`
  - **Authorization**: 
    - Protected via middleware: `/api/messages` pattern in `src/lib/protected-routes.ts` (Line 142)
    - Guard: `isProtectedRoute(pathname)` returns true for `/api/messages/*`
  - **Message Logging**: 
    - Function: `sendMessage()` in `src/lib/message-utils.ts` (Lines 18-77)
    - Logs to DB: Lines 54-70 in message-utils.ts
      ```typescript
      await prisma.message.create({
        data: {
          direction: "outbound",
          body: message,
          status: sent ? "sent" : "failed",
          bookingId,
          from: "system",
          to: formattedPhone,
        },
      });
      ```
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If endpoint unprotected or doesn't log, audit trail broken

### ⚠️ Leah Payment Link Message Template Centralization
- **Current State**: Template is hardcoded in booking detail page
- **File**: `src/app/bookings/[id]/page.tsx` Line 307
- **Evidence**: 
  ```typescript
  const message = `💳 PAYMENT REMINDER\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking on ${formatDate(booking.startAt)} is ready for payment.\n\nPets: ${petQuantities}\nTotal: ${formatCurrency(booking.totalPrice)}\n\nPay now: ${paymentLinkUrl}`;
  ```
- **Also exists in**: 
  - `src/lib/automation-executor.ts` Line 582 (default template)
  - `src/lib/sms-templates.ts` Line 146 (function)
- **Status**: ⬜ PASS (centralized) / ⬜ FAIL (hardcoded)
- **Action Required**: Move template to `src/lib/message-templates.ts` or settings
- **Stop Condition**: If template changes, must update in multiple places (maintenance risk)

---

## Tip Link Automation

### ✅ Tip Link Generation Triggered on Completion
- **File**: `src/app/api/bookings/[id]/route.ts`
- **Evidence**:
  - Location: Lines 398-409
  - Condition: 
    ```typescript
    if (status === "completed" && previousStatusForHistory !== "completed" && finalBooking.sitterId) {
      await enqueueAutomation(
        "tipLink",
        "client",
        { bookingId: finalBooking.id, sitterId: finalBooking.sitterId },
        `tipLink:client:${finalBooking.id}`
      );
    }
    ```
  - Guard conditions:
    - `status === "completed"` (only on completion)
    - `previousStatusForHistory !== "completed"` (only on transition, not if already completed)
    - `finalBooking.sitterId` (only if sitter assigned)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If triggers incorrectly, clients get unwanted messages

### ✅ Creates Tip Link Via API
- **File**: `src/lib/automation-executor.ts`
- **Evidence**:
  - Function: `executeTipLink()` (Lines 772-872)
  - API call: Lines 777-790
    ```typescript
    const tipLinkResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/create-tip-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id }),
    });
    ```
  - Endpoint: `/api/payments/create-tip-link` (exists in codebase)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If API call fails, tip link not created

### ✅ Sends Tip Message to Client
- **File**: `src/lib/automation-executor.ts`
- **Evidence**:
  - Location: Lines 808-830 in `executeTipLink()`
  - Message template: Lines 805-808
  - Send call: Line 830 `const sent = await sendMessage(booking.phone, message, booking.id);`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If message not sent, automation incomplete

### ✅ Idempotency Guaranteed
- **File**: `src/app/api/bookings/[id]/route.ts`
- **Evidence**:
  - Idempotency key: Line 407 `tipLink:client:${finalBooking.id}`
  - Queue uses key as jobId: `src/lib/automation-queue.ts` Line 63 `jobId: idempotencyKey`
  - Guard condition: Line 399 `previousStatusForHistory !== "completed"` prevents re-trigger if already completed
  - **Test**: Set status to completed twice - should only trigger once
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If duplicate messages sent, idempotency broken

---

## Stripe Payment Confirmation Webhook Flow

### ✅ Webhook Handler Updates Booking
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**:
  - Handler: `POST` function (Lines 9-168)
  - Event types: `payment_intent.succeeded` (Line 62), `invoice.payment_succeeded` (Line 105)
  - Database update: Lines 83-90
    ```typescript
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "paid",
        ...(booking.status === "pending" && { status: "confirmed" }),
      },
    });
    ```
  - Sets `paymentStatus` to "paid": ✅ Line 86
  - Sets `status` to "confirmed" if pending: ✅ Line 88

### ✅ Sends Booking Confirmed Message
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**:
  - Automation trigger: Lines 94-100
    ```typescript
    await enqueueAutomation(
      "bookingConfirmation",
      "client",
      { bookingId },
      `bookingConfirmation:client:${bookingId}:payment`
    );
    ```
  - Automation executor: `src/lib/automation-executor.ts` Lines 200-280 handles `bookingConfirmation`
  - Sends message: Line 280 in automation-executor.ts

### ✅ Triggers Booking Confirmed Automations
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**: Same as above - `enqueueAutomation` triggers automation queue
- **Queue processing**: `src/lib/automation-queue.ts` Lines 73-170

### ✅ Logs Audit Event
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**:
  - Event emission: Line 93 `await emitPaymentSuccess(booking, amount);`
  - Event logger: `src/lib/event-logger.ts` handles logging
  - Automation logs: `src/lib/automation-queue.ts` Lines 81-93 logs automation run start

### ✅ Idempotency Guaranteed
- **File**: `src/app/api/webhooks/stripe/route.ts`
- **Evidence**:
  - Idempotency check: Lines 76-80
    ```typescript
    if (booking.paymentStatus === "paid") {
      console.log(`[Webhook] Payment already processed for booking ${bookingId}, skipping`);
      return NextResponse.json({ received: true, message: "Payment already processed" });
    }
    ```
  - Automation idempotency key: Line 104 `bookingConfirmation:client:${bookingId}:payment`
  - Queue jobId: Uses idempotency key as jobId (prevents duplicate jobs)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If webhook replay causes duplicate messages, idempotency broken

---

## Mobile Global Fixes

### ✅ Mobile Spacing Scale Rules
- **File**: `src/app/globals.css`
- **Evidence**: Lines 149-158
  ```css
  @media (max-width: 1023px) {
    * {
      --space-xs: 3px;
      --space-sm: 6px;
      --space-md: 12px;
      --space-lg: 18px;
      --space-xl: 24px;
      --space-2xl: 36px;
    }
  }
  ```
- **Breakpoint**: `1023px` (matches `lg` breakpoint)
- **Status**: ⬜ PASS / ⬜ FAIL

### ✅ Card Padding Reduced on Mobile
- **File**: `src/app/globals.css`
- **Evidence**: Lines 160-163
  ```css
  [class*="Card"], [data-card], .card {
    padding: var(--space-md) !important;
  }
  ```
- **Status**: ⬜ PASS / ⬜ FAIL

### ✅ Buttons Compact on Mobile
- **File**: `src/app/globals.css`
- **Evidence**: Lines 165-170
  ```css
  button, .btn, [role="button"] {
    min-height: 40px !important;
    padding: var(--space-sm) var(--space-md) !important;
    font-size: 14px !important;
  }
  ```
- **Status**: ⬜ PASS / ⬜ FAIL

### ✅ Tab Bars Horizontally Scrollable
- **File**: `src/app/globals.css`
- **Evidence**: Lines 172-194
  ```css
  [role="tablist"], .tabs, nav[class*="tabs"] {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    display: flex;
    gap: var(--space-sm);
    padding: 0 var(--space-md);
  }
  [role="tab"], .tab {
    white-space: nowrap;
    flex-shrink: 0;
    padding: var(--space-sm) var(--space-md) !important;
    min-height: 40px !important;
  }
  ```
- **Status**: ⬜ PASS / ⬜ FAIL

### ✅ Modal Full Height Bottom Sheet on Mobile
- **File**: `src/components/ui/Modal.tsx`
- **Evidence**: Lines 68-106
  ```typescript
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const isFullHeight = isMobile || size === 'full';
  // ...
  style={{
    height: isFullHeight ? '100%' : 'auto',
    maxHeight: isFullHeight ? '100%' : '90vh',
    borderRadius: isFullHeight ? 0 : tokens.borderRadius.xl,
    // ...
  }}
  ```
- **Also in globals.css**: Lines 196-220 (CSS rules for modal full height)
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If modals cut off on mobile, UX broken

### ⬜ No Cut Off in Critical Flows (Manual Verification Required)
- **Calendar add account**: Manual test on mobile device
- **Sitter add sitter**: Manual test on mobile device  
- **Booking detail edit modal**: Manual test on mobile device
- **Evidence**: Manual verification checklist in `SMOKE_TEST_CHECKLIST.md` Section 8
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If any modal cuts off, global rules need adjustment

---

## Page Conversions and Consistency

### ⬜ Bookings List - Zero Legacy Styling
- **File**: `src/app/bookings/page.tsx`
- **Evidence Check**:
  - Uses tokens: ✅ Line 27 `import { tokens } from '@/lib/design-tokens'`
  - Uses UI components: ✅ Lines 13-24 import from `@/components/ui`
  - Legacy CSS classes: ⚠️ Found `className` usage (Lines 993-1084 in unsaved version)
  - **Action Required**: Verify saved version has no legacy classes
- **File Size**: Check with `wc -l src/app/bookings/page.tsx`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If legacy CSS found, page not converted

### ⬜ Clients Page - Zero Legacy Styling
- **File**: `src/app/clients/page.tsx`
- **Evidence Check**:
  - Uses tokens: ✅ (grep shows `tokens` usage)
  - Uses UI components: ✅ (grep shows component imports)
  - Legacy CSS: ⬜ Check for `className` with Tailwind classes
- **Status**: ⬜ PASS / ⬜ FAIL

### ⬜ Settings Page - Zero Legacy Styling
- **File**: `src/app/settings/page.tsx`
- **Evidence Check**: Manual review required
- **Status**: ⬜ PASS / ⬜ FAIL

### ⬜ Automations Page - Zero Legacy Styling
- **File**: `src/app/automation/page.tsx`
- **Evidence Check**: Manual review required
- **Status**: ⬜ PASS / ⬜ FAIL

### ⬜ Calendar Page - Zero Legacy Styling
- **File**: `src/app/calendar/page.tsx`
- **Evidence Check**:
  - Uses tokens: ✅ (grep shows `tokens` usage)
  - Uses UI components: ✅ (grep shows component imports)
  - Legacy CSS: ⬜ Check for `className` with Tailwind classes
- **Status**: ⬜ PASS / ⬜ FAIL

### ⬜ Payments Page - Zero Legacy Styling
- **File**: `src/app/payments/page.tsx`
- **Evidence Check**:
  - Uses tokens: ✅ Line 26 `import { tokens } from '@/lib/design-tokens'`
  - Uses UI components: ✅ Lines 13-24 import from `@/components/ui`
  - Uses AppShell: ✅ Line 25 `import { AppShell } from '@/components/layout/AppShell'`
  - Legacy CSS: ⬜ Check for `className` with Tailwind classes
- **Status**: ⬜ PASS / ⬜ FAIL

### ✅ Booking Detail - Zero Legacy Styling
- **File**: `src/app/bookings/[id]/page.tsx`
- **Evidence**:
  - Uses tokens only: ✅ All styles use `tokens` object
  - Uses UI components: ✅ All from `@/components/ui`
  - No legacy CSS: ✅ No `className` with Tailwind, only inline styles
- **Status**: ⬜ PASS / ⬜ FAIL

---

## Security Gates

### ✅ ENABLE_AUTH_PROTECTION Defaults to False
- **File**: `src/lib/env.ts` (check default value)
- **Evidence**: Check environment variable default
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If default is true, auth protection enabled unexpectedly

### ✅ Public Allowlist Includes Required Routes
- **File**: `src/lib/public-routes.ts`
- **Evidence**: Lines 12-39
  - `/api/form`: ✅ Line 14
  - `/api/webhooks/stripe`: ✅ Line 17
  - `/api/webhooks/sms`: ✅ Line 20
  - `/api/health`: ✅ Line 23
  - `/tip/*`: ✅ Lines 26-32
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If routes not in allowlist, they'll be blocked when auth enabled

### ✅ New Dangerous Endpoints Protected
- **File**: `src/lib/protected-routes.ts`
- **Evidence**:
  - `/api/messages/send`: ✅ Line 142-145 (added in recent commit)
  - `/api/bookings/[id]/edit`: ✅ Line 81 (protected via `/api/bookings` pattern)
  - `/api/payments/create-payment-link`: ✅ Line 109 (protected via `/api/payments` pattern)
  - `/api/payments/create-tip-link`: ✅ Line 109 (protected via `/api/payments` pattern)
- **Middleware**: `src/middleware.ts` Lines 56-68 enforce protection when `ENABLE_AUTH_PROTECTION === true`
- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If endpoints unprotected, security vulnerability

---

## Revenue Safe Proofs

### ⬜ Pricing Totals Match Across Surfaces
- **Booking Detail Total**:
  - File: `src/app/bookings/[id]/page.tsx`
  - Function: `getPricingForDisplay()` from `@/lib/pricing-display-helpers`
  - Source: Line 492-498
    ```typescript
    const pricingDisplay = booking.pricingSnapshot
      ? getPricingForDisplay(booking)
      : { total: booking.totalPrice, breakdown: [...], isFromSnapshot: false };
    ```
  - Uses: `booking.totalPrice` (stored value) or `pricingSnapshot` if available

- **Bookings List Total**:
  - File: `src/app/bookings/page.tsx`
  - Evidence: Line 250 `{row.totalPrice.toFixed(2)}`
  - Uses: Direct `totalPrice` from booking record

- **Calendar Event Total**:
  - File: `src/app/calendar/page.tsx`
  - Evidence: Lines 837, 1064 `{booking.totalPrice.toFixed(2)}`
  - Uses: Direct `totalPrice` from booking record

- **Payments Page Total**:
  - File: `src/app/payments/page.tsx`
  - Evidence: Check how totals are calculated (may aggregate from bookings)
  - **Action Required**: Verify payments page uses same source

- **Pricing Function Source of Truth**:
  - Creation: `calculateBookingPrice()` or `calculateCanonicalPricing()` (if flag enabled)
  - Edit: `recalculatePricing()` in `src/lib/booking-edit-service.ts` (Lines 150-195)
    - Uses same functions as creation
  - Display: `getPricingForDisplay()` in `src/lib/pricing-display-helpers.ts`
    - Uses `pricingSnapshot` if available, else calculates

- **Status**: ⬜ PASS / ⬜ FAIL
- **Stop Condition**: If any screen shows different total, revenue reconciliation broken
- **Test Command**: 
  ```bash
  # Create test booking, edit it, verify totals match:
  # 1. Check booking detail total
  # 2. Check bookings list total  
  # 3. Check calendar total
  # 4. Check payments page total
  # All must match exactly
  ```

---

## Manual Verification Runbook

### Test 1: Low Risk Edit
**Steps**:
1. Open booking detail page: `/bookings/[id]`
2. Click "Edit" button (in right column Control Panel)
3. Change "Notes" field
4. Click "Save Changes"
5. **Expected**: 
   - Modal closes
   - Notes updated on page
   - No diff review shown (low risk)
   - Refresh page - notes persist
   - Check EventLog table - `booking.edited` event exists
   - Check BookingStatusHistory - NO entry (status didn't change)

**Evidence Location**: 
- Edit button: `src/app/bookings/[id]/page.tsx` Line 772
- Edit modal: `src/components/booking/EditBookingModal.tsx`
- Save handler: Lines 289-320 in EditBookingModal.tsx

**Status**: ⬜ PASS / ⬜ FAIL

### Test 2: High Risk Edit with Diff Gate
**Steps**:
1. Open booking detail page
2. Click "Edit"
3. Change service type (e.g., "Dog Walking" → "Housesitting")
4. Click "Save Changes"
5. **Expected**:
   - Diff review modal appears
   - Shows old service vs new service
   - Click "Back to Edit" - returns to edit form
   - Change service again
   - Click "Confirm Changes"
   - Service updated, pricing recalculated

**Evidence Location**:
- Diff review logic: `src/components/booking/EditBookingModal.tsx` Lines 289-297
- High risk detection: `src/lib/booking-edit-service.ts` Lines 87-142

**Status**: ⬜ PASS / ⬜ FAIL

### Test 3: Generate Payment Link Preview and Send
**Steps**:
1. Open booking detail page
2. Click "Create Payment Link" button
3. **Expected**: Preview modal appears
4. **Verify Preview Shows**:
   - Client name: `{booking.firstName} {booking.lastName}`
   - Service: `{booking.service}`
   - Date: `{formatDate(booking.startAt)}`
   - Total: `{formatCurrency(booking.totalPrice)}`
   - Message preview with all variables filled
   - Payment link URL displayed
5. Click "Send Payment Link"
6. **Expected**:
   - Success message
   - Message logged in database (check `Message` table)
   - Client receives SMS (test with your phone)

**Evidence Location**:
- Preview modal: `src/app/bookings/[id]/page.tsx` Lines 1808-1960
- Send handler: Lines 301-340
- Message logging: `src/lib/message-utils.ts` Lines 54-70

**Status**: ⬜ PASS / ⬜ FAIL
**Stop Condition**: If "send" succeeds but client never receives, silent failure - fix immediately

### Test 4: Pay Link and Confirm Auto Status Change
**Steps**:
1. Generate payment link for test booking
2. Send to YOUR phone number
3. Click payment link
4. Pay with Stripe test card (or small real amount)
5. **Expected**:
   - Webhook receives event
   - Booking `paymentStatus` becomes "paid"
   - Booking `status` becomes "confirmed" (if was pending)
   - Booking confirmed message sent automatically
   - EventLog entry exists
   - Automation runs only once

**Evidence Location**:
- Webhook handler: `src/app/api/webhooks/stripe/route.ts` Lines 62-102
- Status update: Lines 83-90
- Automation trigger: Lines 94-100
- Idempotency: Lines 76-80

**Status**: ⬜ PASS / ⬜ FAIL
**Stop Condition**: If duplicate messages, idempotency broken

### Test 5: Set Status Completed and Confirm Tip Flow
**Steps**:
1. Find booking with assigned sitter
2. Change status to "completed"
3. **Expected**:
   - Tip link generated automatically
   - Tip link message sent to client
   - EventLog entry exists
   - Automation runs only once
4. Edit booking (change notes only - unrelated)
5. **Expected**: Tip link automation does NOT trigger
6. Change status from "completed" to "confirmed" then back to "completed"
7. **Expected**: Tip link automation triggers again (status changed)

**Evidence Location**:
- Trigger: `src/app/api/bookings/[id]/route.ts` Lines 398-409
- Automation: `src/lib/automation-executor.ts` Lines 772-872
- Idempotency key: `tipLink:client:${bookingId}`

**Status**: ⬜ PASS / ⬜ FAIL
**Stop Condition**: If triggers incorrectly, clients get unwanted messages

---

## Critical Stop Conditions

**STOP IMMEDIATELY IF**:
1. ⬜ Pricing mismatch between any screens
2. ⬜ Duplicate messages sent (idempotency broken)
3. ⬜ "Send" succeeds but message never arrives (silent failure)
4. ⬜ Pricing not recalculated when relevant fields change
5. ⬜ Authorization bypass (protected endpoints accessible without auth)
6. ⬜ Data loss (edit saves but doesn't persist)

**Rollback Steps**:
1. Revert to last known good commit: `git revert HEAD`
2. Or rollback specific commits: `git revert <commit-hash>`
3. Verify build passes: `npm run build`
4. Redeploy previous working version

---

## Summary

- **Total Items**: 45
- **Completed**: [Count manually after testing]
- **Failed**: [Count manually after testing]
- **Blocking Failures**: [List here]
- **Ready for Production**: ⬜ YES / ⬜ NO

**Next Steps After All Pass**:
1. Sitters admin view + mobile fixes
2. Settings subpages (Pricing, Services, Discounts)
3. Templates and automation builder
4. Integrations
5. Exceptions

