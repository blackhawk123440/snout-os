# Dashboard Mandatory Backlog - Acceptance Criteria

**Generated**: $(date)  
**Purpose**: Numbered epics and tickets with exact acceptance criteria derived from mandatory feature spec  
**Priority**: As specified by user (Priority 0 = Mobile, Priority 1 = Revenue Critical, etc.)

---

## Priority 0: Mobile Readability and No Clipping

### Epic 0.1: Mobile Layout Fixes Across All Converted Pages

#### Ticket 0.1.1: Calendar Mobile Fixes
**Definition of Done**:
- Today button and container not smashed on mobile (390x844 and 430x932)
- Calendar grid fits screen width without horizontal scroll
- Calendar settings "Add Account" modal fits screen, no cut off top or bottom
- All content scrollable within viewport

**Acceptance Tests**:
1. Open calendar on iPhone 14 (390x844) and iPhone 15 Pro (430x932)
2. Verify Today button is fully visible and clickable
3. Verify calendar grid fits screen, no horizontal scroll
4. Click "Calendar Settings" → "Add Account"
5. Verify modal is full-height bottom sheet, all content visible, scrollable
6. Verify no content cut off at top or bottom

**Rollback Plan**: Revert `src/app/calendar/page.tsx` and `src/app/calendar/accounts/page.tsx` changes

**Flag Gating**: None (mobile-only changes)

**Evidence Location**: 
- Today button: `src/app/calendar/page.tsx` Line 422
- Add account route: `src/app/calendar/accounts/page.tsx`

---

#### Ticket 0.1.2: Booking Detail Mobile Card Compactness
**Definition of Done**:
- All intelligence cards (Schedule, Pets, Pricing, Notes) are slim on mobile
- All info stays visible, layout is compact
- No giant padding or spacing
- Cards fit within viewport without excessive scrolling

**Acceptance Tests**:
1. Open booking detail on mobile (390x844)
2. Verify Schedule & Service card is collapsed by default, compact when expanded
3. Verify Pets & Care card is compact
4. Verify Pricing Breakdown card is compact
5. Verify Notes & History card is compact
6. Verify all cards use mobile spacing scale (from globals.css)
7. Verify no horizontal scroll

**Rollback Plan**: Revert `src/app/bookings/[id]/page.tsx` card padding changes

**Flag Gating**: None

**Evidence Location**: 
- Cards: `src/app/bookings/[id]/page.tsx` Lines 659, 822, 925, 993
- Mobile spacing: `src/app/globals.css` Lines 151-158

---

#### Ticket 0.1.3: Sitter Management Mobile Fixes
**Definition of Done**:
- "View Dashboard" button not cut off on mobile
- "Add Sitter" modal fits screen, no cut off top or bottom
- Active sitter checkbox label aligned properly (if checkbox exists)

**Acceptance Tests**:
1. Open sitter management on mobile (390x844)
2. Verify "View Dashboard" button is fully visible in sitter card
3. Click "Add Sitter"
4. Verify modal is full-height bottom sheet
5. Verify all form fields visible and accessible
6. Verify no content cut off
7. Check for active sitter checkbox (if exists) - verify label alignment

**Rollback Plan**: Revert `src/app/bookings/sitters/page.tsx` changes

**Flag Gating**: None

**Evidence Location**: 
- View Dashboard button: `src/app/bookings/sitters/page.tsx` Lines 349-356
- Add Sitter modal: Lines 382-541

---

#### Ticket 0.1.4: Sitter Dashboard Mobile Tab Spacing
**Definition of Done**:
- Tabs (Pending, Accepted, Archived, Too Late, Tier) have correct spacing
- Tabs wrap properly on small screens
- No cramped appearance

**Acceptance Tests**:
1. Open sitter dashboard on mobile (390x844)
2. Verify tabs are horizontally scrollable (per globals.css rules)
3. Verify tab spacing is consistent
4. Verify tabs don't appear cramped
5. Verify all tab labels readable

**Rollback Plan**: Revert `src/app/sitter-dashboard/page.tsx` tab styling

**Flag Gating**: None

**Evidence Location**: 
- Tabs: `src/app/sitter-dashboard/page.tsx` Lines 245-251, 261-265
- Tab CSS: `src/app/globals.css` Lines 172-194

---

#### Ticket 0.1.5: Automations Page Mobile Fixes
**Definition of Done**:
- Automation cards are readable on mobile
- "Configure" buttons are visible and accessible
- Top filter tabs (All, Booking, Reminder, Payment, Notification) are spaced and readable

**Acceptance Tests**:
1. Open automations page on mobile (390x844)
2. Verify automation cards are readable (text not too small)
3. Verify "Configure" button is visible and clickable on each card
4. Verify filter tabs are horizontally scrollable
5. Verify tab spacing is adequate
6. Verify all tab labels readable

**Rollback Plan**: Revert `src/app/automation/page.tsx` card and tab styling

**Flag Gating**: None

**Evidence Location**: 
- Cards: `src/app/automation/page.tsx` Lines 470-577
- Filter tabs: Lines 296-302, 435-445

---

#### Ticket 0.1.6: Payments Page Mobile Row Compactness
**Definition of Done**:
- Payment table rows are compact on mobile
- Rows are aligned properly
- No huge containers
- Readable like a finance feed

**Acceptance Tests**:
1. Open payments page on mobile (390x844)
2. Verify payment table rows are compact (not oversized)
3. Verify row alignment is correct
4. Verify no excessive padding in rows
5. Verify table is horizontally scrollable if needed
6. Verify readability (like finance feed)

**Rollback Plan**: Revert `src/app/payments/page.tsx` table styling

**Flag Gating**: None

**Evidence Location**: 
- Table: `src/app/payments/page.tsx` Lines 268-343, 502-507

---

#### Ticket 0.1.7: Settings Page Mobile Tab and Icon Alignment
**Definition of Done**:
- Top filter tabs (General, Integrations, Automations, Advanced) are not cramped
- Tab icons are aligned properly with labels
- No visual misalignment

**Acceptance Tests**:
1. Open settings page on mobile (390x844)
2. Verify filter tabs are horizontally scrollable
3. Verify tab spacing is adequate (not cramped)
4. Verify icons align properly with tab labels
5. Verify all tabs readable

**Rollback Plan**: Revert `src/app/settings/page.tsx` tab styling

**Flag Gating**: None

**Evidence Location**: 
- Tabs: `src/app/settings/page.tsx` Lines 159-164, 183

---

## Priority 1: Revenue Critical Automations

### Epic 1.1: Send Payment Link Button

#### Ticket 1.1.1: Send Payment Link Uses Booking Total and Leah Template
**Definition of Done**:
- Button exists on booking detail (already exists, verify)
- When pressed, uses `booking.totalPrice` for payment link amount
- Sends Leah's normal payment link message template
- Message is logged to Message table
- Payment link reference is stored in `booking.stripePaymentLinkUrl`

**Acceptance Tests**:
1. Open booking detail page
2. Click "Create Payment Link" button
3. Verify preview modal shows correct total (`booking.totalPrice`)
4. Verify message preview shows Leah template with variables filled:
   - Client name: `{booking.firstName}`
   - Service: `{booking.service}`
   - Date: `{formatDate(booking.startAt)}`
   - Pets: `{petQuantities}`
   - Total: `{formatCurrency(booking.totalPrice)}`
   - Payment link: `{paymentLinkUrl}`
5. Click "Send Payment Link"
6. Verify message is logged in `Message` table (check database)
7. Verify `booking.stripePaymentLinkUrl` is updated (check database)

**Rollback Plan**: Revert `src/app/bookings/[id]/page.tsx` payment link handler changes

**Flag Gating**: None (revenue critical, must work)

**Evidence Location**: 
- Button: `src/app/bookings/[id]/page.tsx` Lines 1277-1281
- Handler: Lines 275-299, 301-341
- Template: Line 307 (currently hardcoded, needs centralization)

**Note**: Template is hardcoded - Ticket 1.1.2 should centralize it.

---

#### Ticket 1.1.2: Centralize Payment Link Message Template
**Definition of Done**:
- Payment link message template moved to centralized location
- Template referenced from booking detail page
- Template supports variable substitution
- Template can be edited in settings (future)

**Acceptance Tests**:
1. Verify template is in `src/lib/message-templates.ts` or settings
2. Verify booking detail page imports and uses centralized template
3. Verify template variables are substituted correctly
4. Verify message preview shows correct template

**Rollback Plan**: Revert to hardcoded template if needed

**Flag Gating**: None

**Evidence Location**: 
- Current hardcoded: `src/app/bookings/[id]/page.tsx` Line 307
- Target: Create `src/lib/payment-link-templates.ts` or add to settings

---

### Epic 1.2: Payment Confirmation Automation

#### Ticket 1.2.1: Verify Payment Confirmation Automation Works
**Definition of Done**:
- Stripe webhook receives payment success event
- Booking `paymentStatus` becomes "paid"
- Booking `status` becomes "confirmed" (if was pending)
- "Booking confirmed" message is sent automatically
- Audit log entry exists
- Automation runs only once (idempotent)

**Acceptance Tests**:
1. Create test booking with payment link
2. Pay with Stripe test card
3. Verify webhook receives event (check logs)
4. Verify `booking.paymentStatus === "paid"` (check database)
5. Verify `booking.status === "confirmed"` if was pending (check database)
6. Verify booking confirmed message sent (check Message table)
7. Verify EventLog entry exists (check database)
8. Replay webhook event - verify no duplicate messages
9. Verify automation runs only once

**Rollback Plan**: Revert `src/app/api/webhooks/stripe/route.ts` if broken

**Flag Gating**: None (revenue critical)

**Evidence Location**: 
- Webhook: `src/app/api/webhooks/stripe/route.ts` Lines 62-108
- Idempotency: Lines 76-80
- Automation trigger: Lines 94-105

**Status**: ✅ Already implemented, needs verification

---

### Epic 1.3: Tip Link Automation

#### Ticket 1.3.1: Verify Tip Link Automation After Last Visit
**Definition of Done**:
- After booking status becomes "completed", tip link is auto-generated
- Tip amount is calculated from booking total by defined rule
- Tip message is auto-sent to client
- Event is logged
- Automation is idempotent (only triggers once)

**Acceptance Tests**:
1. Create booking with assigned sitter
2. Set booking status to "completed"
3. Verify tip link is generated (check `booking.tipLinkUrl` in database)
4. Verify tip amount matches defined rule (e.g., 15% of total or fixed amount)
5. Verify tip message is sent to client (check Message table)
6. Verify EventLog entry exists
7. Edit booking (unrelated field) - verify tip automation does NOT trigger
8. Set status to completed again - verify automation does NOT trigger (idempotent)

**Rollback Plan**: Revert `src/app/api/bookings/[id]/route.ts` tip link trigger

**Flag Gating**: None (revenue critical)

**Evidence Location**: 
- Trigger: `src/app/api/bookings/[id]/route.ts` Lines 398-409
- Executor: `src/lib/automation-executor.ts` Lines 772-872
- Tip calculation: Not found - needs definition

**Note**: Tip calculation rule needs to be defined and implemented.

---

#### Ticket 1.3.2: Define and Implement Tip Calculation Rule
**Definition of Done**:
- Tip calculation rule is defined (e.g., 15% of booking total, or configurable)
- Rule is implemented in tip link creation
- Rule is documented

**Acceptance Tests**:
1. Verify tip amount calculation function exists
2. Test with booking total $100 - verify tip amount matches rule
3. Verify rule is applied in `src/lib/automation-executor.ts` executeTipLink

**Rollback Plan**: Revert tip calculation changes

**Flag Gating**: None

**Evidence Location**: 
- Tip link creation: `src/app/api/payments/create-tip-link/route.ts` (assumed)
- Executor: `src/lib/automation-executor.ts` Lines 804-808

---

## Priority 2: Tiers and Sitter Management UI Fixes

### Epic 2.1: Sitter Tiers System Completion

#### Ticket 2.1.1: Tier Badges Show Everywhere Sitter Appears
**Definition of Done**:
- Tier badge displays in sitter list page
- Tier badge displays in bookings list (sitter column)
- Tier badge displays in booking detail (assigned sitter)
- Tier badge displays in calendar (sitter filter/view)
- Badge shows tier name and optionally priority level

**Acceptance Tests**:
1. Open sitter list page - verify tier badge on each sitter card
2. Open bookings list - verify tier badge in sitter column
3. Open booking detail with assigned sitter - verify tier badge
4. Open calendar - verify tier badge in sitter-related views
5. Verify badge is readable and properly styled

**Rollback Plan**: Revert badge component additions

**Flag Gating**: None

**Evidence Location**: 
- Sitter list: `src/app/bookings/sitters/page.tsx` Lines 259-376 (no badge currently)
- Bookings list: `src/app/bookings/page.tsx` (sitter column exists, no badge)
- Booking detail: `src/app/bookings/[id]/page.tsx` (sitter display exists, no badge)

---

#### Ticket 2.1.2: Define Tier System Rules and Unlocks
**Definition of Done**:
- Tier names are defined (e.g., "Bronze", "Silver", "Gold", "Platinum")
- Why each tier matters to sitter is documented
- Accomplishments required per tier are defined
- What each tier unlocks is defined
- System enforces at least one real unlock per tier

**Acceptance Tests**:
1. Verify tier definitions exist in database or config
2. Verify each tier has:
   - Clear name
   - Point target or requirements
   - At least one unlock (e.g., can take house sits, higher commission, priority routing)
3. Verify unlocks are enforced in booking assignment logic
4. Verify sitter can see why they want to climb tiers

**Rollback Plan**: N/A (documentation/configuration)

**Flag Gating**: None

**Evidence Location**: 
- Tier model: `prisma/schema.prisma` Lines 501-518
- Benefits field: Line 507 (JSON object)
- Unlocks: `canTakeHouseSits`, `canTakeTwentyFourHourCare` (Lines 509-510)

---

### Epic 2.2: Bookings List Multi-Filter and Sort

#### Ticket 2.2.1: Multi-Select Sitter Filter
**Definition of Done**:
- Sitter filter supports selecting multiple sitters
- Filter UI uses multi-select component
- Bookings are filtered to show only selected sitters
- "All" option clears sitter filter

**Acceptance Tests**:
1. Open bookings list
2. Verify sitter filter is multi-select (not single select)
3. Select multiple sitters
4. Verify bookings list shows only bookings for selected sitters
5. Select "All" - verify all bookings shown
6. Combine with other filters - verify multi-filter works

**Rollback Plan**: Revert `src/app/bookings/page.tsx` filter changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/bookings/page.tsx` - single sitter filter may exist in unsaved version
- Target: Add multi-select sitter filter

---

#### Ticket 2.2.2: Multi-Select Status Filter
**Definition of Done**:
- Status filter supports selecting multiple statuses
- Filter UI uses multi-select component
- Bookings are filtered to show only selected statuses
- "All" option clears status filter

**Acceptance Tests**:
1. Open bookings list
2. Verify status filter is multi-select
3. Select multiple statuses (e.g., "pending" and "confirmed")
4. Verify bookings list shows only bookings with selected statuses
5. Select "All" - verify all bookings shown

**Rollback Plan**: Revert `src/app/bookings/page.tsx` filter changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/bookings/page.tsx` Lines 59, 98-108 (single select)

---

#### Ticket 2.2.3: Date Range Filter
**Definition of Done**:
- Date range filter exists (start date, end date)
- Bookings are filtered by `startAt` date within range
- Date picker components are used
- Range can be cleared

**Acceptance Tests**:
1. Open bookings list
2. Verify date range filter exists (start and end date inputs)
3. Select date range (e.g., Jan 1 - Jan 31)
4. Verify bookings list shows only bookings with `startAt` in range
5. Clear date range - verify all bookings shown

**Rollback Plan**: Revert `src/app/bookings/page.tsx` filter changes

**Flag Gating**: None

**Evidence Location**: 
- Current: Only "today" filter exists (Line 98-105)

---

#### Ticket 2.2.4: Payment Status Filter
**Definition of Done**:
- Payment status filter exists
- Options: "all", "paid", "unpaid", "pending"
- Bookings are filtered by `paymentStatus` field
- Filter works with other filters

**Acceptance Tests**:
1. Open bookings list
2. Verify payment status filter exists
3. Select "paid" - verify only paid bookings shown
4. Select "unpaid" - verify only unpaid bookings shown
5. Combine with status filter - verify multi-filter works

**Rollback Plan**: Revert `src/app/bookings/page.tsx` filter changes

**Flag Gating**: None

**Evidence Location**: 
- Booking model: `prisma/schema.prisma` Line 40 `paymentStatus` field exists

---

#### Ticket 2.2.5: Service Type Filter
**Definition of Done**:
- Service type filter exists
- Options: "all", "Dog Walking", "Housesitting", "24/7 Care", "Drop-ins", "Pet Taxi"
- Bookings are filtered by `service` field
- Filter works with other filters

**Acceptance Tests**:
1. Open bookings list
2. Verify service type filter exists
3. Select "Dog Walking" - verify only dog walking bookings shown
4. Combine with other filters - verify multi-filter works

**Rollback Plan**: Revert `src/app/bookings/page.tsx` filter changes

**Flag Gating**: None

**Evidence Location**: 
- Booking model: `prisma/schema.prisma` Line 30 `service` field exists

---

#### Ticket 2.2.6: Enhanced Sorting Options
**Definition of Done**:
- Sort by date (ascending/descending)
- Sort by sitter (alphabetical)
- Sort by total (ascending/descending)
- Sort by status (alphabetical or custom order)
- Sort direction toggle exists

**Acceptance Tests**:
1. Open bookings list
2. Verify sort options include: date, sitter, total, status
3. Verify sort direction can be toggled (asc/desc)
4. Test each sort option - verify bookings are sorted correctly
5. Verify sort persists when filters change

**Rollback Plan**: Revert `src/app/bookings/page.tsx` sort changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/bookings/page.tsx` Lines 61, 124-132 (date, name, price only)

---

## Priority 3: Automations Persistence and Builder

### Epic 3.1: Automations Builder That Saves for Real

#### Ticket 3.1.1: Create Automation from UI
**Definition of Done**:
- "Create Automation" button exists on automations page
- Clicking opens automation builder modal/drawer
- Builder allows setting:
  - Name
  - Description
  - Trigger (dropdown with options)
  - Enabled/disabled toggle
- On save, creates `Automation` record in database
- Automation persists after page refresh

**Acceptance Tests**:
1. Open automations page
2. Click "Create Automation" button
3. Fill in name, description, trigger
4. Click "Save"
5. Verify automation appears in list
6. Refresh page - verify automation still exists
7. Check database - verify `Automation` record exists

**Rollback Plan**: Revert `src/app/automation/page.tsx` and `src/app/api/automations/route.ts` changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER` (optional, for safety)

**Evidence Location**: 
- Current page: `src/app/automation/page.tsx` (saves to settings, not Automation model)
- API exists: `src/app/api/automations/route.ts` Lines 44-100 (POST handler)

---

#### Ticket 3.1.2: Edit Automation from UI
**Definition of Done**:
- Each automation card has "Edit" button
- Clicking opens automation builder with pre-filled data
- Builder allows editing all fields
- On save, updates `Automation` record in database
- Changes persist after page refresh

**Acceptance Tests**:
1. Open automations page
2. Click "Edit" on an automation
3. Modify name or description
4. Click "Save"
5. Verify changes appear in list
6. Refresh page - verify changes persist
7. Check database - verify `Automation` record updated

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- API exists: `src/app/api/automations/[id]/route.ts` (PATCH handler assumed)

---

#### Ticket 3.1.3: Disable Automation from UI
**Definition of Done**:
- Each automation card has enable/disable toggle
- Toggling updates `Automation.enabled` field
- Disabled automations don't run
- Toggle persists after page refresh

**Acceptance Tests**:
1. Open automations page
2. Toggle automation to disabled
3. Verify automation shows "Disabled" badge
4. Refresh page - verify toggle state persists
5. Check database - verify `Automation.enabled === false`
6. Trigger automation event - verify disabled automation doesn't run

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Current: Settings-based toggle exists (Line 559-565), but saves to settings not Automation model

---

#### Ticket 3.1.4: Delete Automation from UI
**Definition of Done**:
- Each automation card has "Delete" button
- Clicking shows confirmation dialog
- On confirm, deletes `Automation` record from database
- Automation disappears from list
- Deletion persists after page refresh

**Acceptance Tests**:
1. Open automations page
2. Click "Delete" on an automation
3. Confirm deletion in dialog
4. Verify automation disappears from list
5. Refresh page - verify automation still deleted
6. Check database - verify `Automation` record deleted

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- API exists: `src/app/api/automations/[id]/route.ts` (DELETE handler assumed)

---

#### Ticket 3.1.5: Automation Builder - Trigger Selection
**Definition of Done**:
- Builder has trigger dropdown
- Options include: "booking.created", "booking.confirmed", "booking.completed", "sitter.assigned", "payment.success", etc.
- Selected trigger is saved to `Automation.trigger` field

**Acceptance Tests**:
1. Create new automation
2. Verify trigger dropdown exists
3. Select a trigger (e.g., "booking.created")
4. Save automation
5. Verify trigger is saved in database

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Automation model: `prisma/schema.prisma` Line 203 `trigger` field

---

#### Ticket 3.1.6: Automation Builder - Timing Configuration
**Definition of Done**:
- Builder allows setting delay before execution
- Delay is specified in minutes
- Delay is saved to `AutomationAction.delayMinutes` field
- Multiple actions can have different delays

**Acceptance Tests**:
1. Create automation with action
2. Set delay to 30 minutes
3. Save automation
4. Verify delay is saved in `AutomationAction.delayMinutes`
5. Trigger automation - verify action executes after delay

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Action model: `prisma/schema.prisma` Line 236 `delayMinutes` field

---

#### Ticket 3.1.7: Automation Builder - Recipients Selection
**Definition of Done**:
- Builder allows selecting recipients: "client", "sitter", "owner"
- Multiple recipients can be selected
- Recipients are saved in action config
- Each recipient gets their own action

**Acceptance Tests**:
1. Create automation
2. Add action with recipient "client"
3. Add another action with recipient "sitter"
4. Save automation
5. Verify both actions are saved with correct recipients
6. Trigger automation - verify messages sent to both recipients

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Action config: `prisma/schema.prisma` Line 234 (JSON string)

---

#### Ticket 3.1.8: Automation Builder - Conditions
**Definition of Done**:
- Builder allows adding conditions
- Condition has: field, operator, value
- Multiple conditions can be added
- Conditions are saved to `AutomationCondition` records
- Conditions are evaluated before actions run

**Acceptance Tests**:
1. Create automation
2. Add condition: "service" equals "Dog Walking"
3. Save automation
4. Verify condition is saved in database
5. Trigger automation with matching condition - verify action runs
6. Trigger automation with non-matching condition - verify action doesn't run

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Condition model: `prisma/schema.prisma` Lines 216-227

---

#### Ticket 3.1.9: Automation Builder - Message Editor with Variables
**Definition of Done**:
- Builder has message editor (textarea)
- Editor shows available variables (e.g., `{{firstName}}`, `{{service}}`, `{{totalPrice}}`)
- Variables can be inserted into message
- Message is saved to action config
- Variables are substituted when automation runs

**Acceptance Tests**:
1. Create automation with message action
2. Type message with variables: "Hi {{firstName}}, your {{service}} booking is ready"
3. Save automation
4. Verify message is saved in action config
5. Trigger automation - verify variables are substituted correctly

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Action config: `prisma/schema.prisma` Line 234 (JSON string with message)

---

#### Ticket 3.1.10: Automation Builder - Preview
**Definition of Done**:
- Builder has "Preview" button
- Preview shows message with sample data
- Variables are replaced with sample values
- Preview updates as message is edited

**Acceptance Tests**:
1. Create automation with message
2. Click "Preview"
3. Verify preview modal shows message with sample data
4. Edit message - verify preview updates
5. Verify variables are replaced with sample values

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Similar to payment link preview: `src/app/bookings/[id]/page.tsx` Lines 1808-1960

---

#### Ticket 3.1.11: Automation Builder - Test
**Definition of Done**:
- Builder has "Test" button
- Test sends message to specified phone number
- Test uses actual automation logic
- Test result is shown (success/failure)

**Acceptance Tests**:
1. Create automation with message
2. Enter test phone number
3. Click "Test"
4. Verify test message is sent to phone number
5. Verify test result is displayed
6. Verify actual automation is not triggered by test

**Rollback Plan**: Revert changes

**Flag Gating**: Feature flag `ENABLE_AUTOMATION_BUILDER`

**Evidence Location**: 
- Test message API exists: `src/app/api/automation/test-message/route.ts`

---

## Priority 4: Messaging Architecture Decision and Phase 1 Build

### Epic 4.1: Messaging Architecture Decision

#### Ticket 4.1.1: Choose Messaging Architecture (OpenPhone vs Twilio)
**Definition of Done**:
- Architecture decision documented
- Decision includes:
  - Chosen platform (OpenPhone or Twilio)
  - Rationale for choice
  - Implementation phases
  - Cost considerations
  - Feature comparison

**Acceptance Tests**:
1. Document shows clear decision: OpenPhone OR Twilio
2. Rationale explains why chosen
3. Implementation phases are defined
4. Cost analysis included (if relevant)

**Rollback Plan**: N/A (decision document)

**Flag Gating**: None

**Evidence Location**: 
- Current OpenPhone integration: `src/lib/openphone.ts`
- Current Twilio: Not found (may not exist)

**Note**: User must make this decision. See question at end of document.

---

### Epic 4.2: Messaging Tab with Conversations

#### Ticket 4.2.1: Messaging Tab Shows Conversations
**Definition of Done**:
- Messages page shows conversation list (not just templates)
- Conversations are grouped by booking or client
- Owner can see all conversations
- Sitters see only their conversations
- Conversations show message history

**Acceptance Tests**:
1. Open messages page as owner
2. Verify conversation list shows all conversations
3. Open messages page as sitter
4. Verify conversation list shows only sitter's conversations
5. Click conversation - verify message history loads
6. Verify messages are grouped by booking/client

**Rollback Plan**: Revert `src/app/messages/page.tsx` changes

**Flag Gating**: Feature flag `ENABLE_MESSAGING_TAB` (optional)

**Evidence Location**: 
- Current: `src/app/messages/page.tsx` (templates only)
- Message model: `prisma/schema.prisma` Lines 140-153

---

#### Ticket 4.2.2: Masked Numbers for Clients and Sitters
**Definition of Done**:
- Clients see masked number (not real sitter phone)
- Sitters see masked number (not real client phone)
- Owner sees real numbers
- Masked numbers route correctly via chosen platform (OpenPhone/Twilio)

**Acceptance Tests**:
1. Open conversation as client
2. Verify sitter number is masked (e.g., "***-***-1234")
3. Open conversation as sitter
4. Verify client number is masked
5. Open conversation as owner
6. Verify real numbers are shown
7. Send message from sitter personal phone
8. Verify message routes through masked number system

**Rollback Plan**: Revert messaging routing changes

**Flag Gating**: Feature flag `ENABLE_MASKED_NUMBERS` (optional)

**Evidence Location**: 
- Current: No masking logic found
- OpenPhone integration: `src/lib/openphone.ts`
- Sitter phone fields: `prisma/schema.prisma` Lines 104-106

---

#### Ticket 4.2.3: Sitter Personal Phone Routing
**Definition of Done**:
- Sitter can use personal phone to send messages
- Messages route through masked number system
- Client receives message from masked number
- Owner can see both sitter personal phone and masked number

**Acceptance Tests**:
1. Sitter sends message from personal phone
2. Verify message routes through masked number
3. Verify client receives message from masked number (not personal phone)
4. Verify owner can see sitter's personal phone in admin view
5. Verify message is logged with correct routing info

**Rollback Plan**: Revert routing changes

**Flag Gating**: Feature flag `ENABLE_MASKED_NUMBERS`

**Evidence Location**: 
- Sitter personal phone: `prisma/schema.prisma` Line 104
- Routing logic: To be implemented based on architecture decision

---

## Priority 5: Payments Page Finance Grade V1

### Epic 5.1: Payments Page Enhancements

#### Ticket 5.1.1: Time Range Compare (Current vs Previous)
**Definition of Done**:
- Payments page shows current period and previous period side-by-side
- Compare shows: revenue, payment count, average payment
- Compare highlights differences (increase/decrease)
- Time range selector controls both periods

**Acceptance Tests**:
1. Open payments page
2. Select "Last 30 Days" time range
3. Verify page shows:
   - Current period (last 30 days) metrics
   - Previous period (30 days before that) metrics
   - Difference indicators (↑ or ↓)
4. Change time range - verify both periods update
5. Verify compare is accurate (manual calculation)

**Rollback Plan**: Revert `src/app/payments/page.tsx` compare logic

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/payments/page.tsx` Lines 84-95 (time range exists, no compare)

---

#### Ticket 5.1.2: Enhanced KPIs
**Definition of Done**:
- KPIs include: pending, failed, refunded, tips, payouts, fees
- Each KPI shows count and amount
- KPIs are calculated accurately from payment data
- KPIs update with filters

**Acceptance Tests**:
1. Open payments page
2. Verify KPIs show:
   - Total collected
   - Pending (count and amount)
   - Failed (count and amount)
   - Refunded (count and amount)
   - Tips (count and amount)
   - Payouts (count and amount)
   - Fees (count and amount)
3. Apply filters - verify KPIs update
4. Verify KPI calculations are accurate (manual check)

**Rollback Plan**: Revert `src/app/payments/page.tsx` KPI changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/payments/page.tsx` Lines 127-210 (basic KPIs exist)

---

#### Ticket 5.1.3: Enhanced Filters
**Definition of Done**:
- Filters include: status, date range, payment method, amount range
- Filters work together (multi-filter)
- Filters persist in URL or state
- Clear filters button exists

**Acceptance Tests**:
1. Open payments page
2. Verify filters exist: status, date range, payment method, amount range
3. Apply multiple filters
4. Verify table shows only matching payments
5. Clear filters - verify all payments shown

**Rollback Plan**: Revert `src/app/payments/page.tsx` filter changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/payments/page.tsx` Lines 454-485 (status and search only)

---

#### Ticket 5.1.4: Payment Detail View
**Definition of Done**:
- Clicking payment row opens detail view/modal
- Detail view shows:
  - Payment information
  - Linked booking (if exists)
  - Client information
  - Payment method details
  - Transaction history
- Detail view links to booking detail page

**Acceptance Tests**:
1. Open payments page
2. Click on a payment row
3. Verify detail view/modal opens
4. Verify detail shows payment info, booking link, client info
5. Click booking link - verify navigates to booking detail
6. Verify detail view is readable on mobile

**Rollback Plan**: Revert `src/app/payments/page.tsx` detail view changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/payments/page.tsx` Lines 502-507 (table, no detail view)

---

#### Ticket 5.1.5: CSV Export
**Definition of Done**:
- "Export CSV" button exists on payments page
- Clicking exports filtered payments to CSV
- CSV includes: date, client, amount, status, payment method, booking ID
- CSV is downloadable

**Acceptance Tests**:
1. Open payments page
2. Apply filters
3. Click "Export CSV"
4. Verify CSV file downloads
5. Open CSV - verify includes all payment data
6. Verify CSV only includes filtered payments
7. Verify CSV format is correct (comma-separated, headers)

**Rollback Plan**: Revert `src/app/payments/page.tsx` export changes

**Flag Gating**: None

**Evidence Location**: 
- Current: No export functionality found

---

#### Ticket 5.1.6: Reconciliation Friendly Format
**Definition of Done**:
- Payment table shows all data needed for reconciliation
- Payments link to bookings clearly
- Payment status is clear and accurate
- Export includes reconciliation fields

**Acceptance Tests**:
1. Open payments page
2. Verify table shows: payment ID, booking ID, client, amount, status, date, method
3. Verify payment status matches Stripe status
4. Verify booking link works
5. Export CSV - verify reconciliation fields included

**Rollback Plan**: Revert changes

**Flag Gating**: None

**Evidence Location**: 
- Current: `src/app/payments/page.tsx` Lines 268-343 (table columns)

---

## Priority 6: Admin Google Login Plus Roles

### Epic 6.1: Google Login Implementation

#### Ticket 6.1.1: Google OAuth Provider Configuration
**Definition of Done**:
- NextAuth configured with Google provider
- Google OAuth credentials are stored in settings
- Login page shows "Sign in with Google" button
- Google login works and creates user session

**Acceptance Tests**:
1. Open login page
2. Verify "Sign in with Google" button exists
3. Click button - verify Google OAuth flow starts
4. Complete OAuth - verify user is logged in
5. Verify session is created
6. Verify user can access protected routes

**Rollback Plan**: Revert NextAuth configuration changes

**Flag Gating**: Feature flag `ENABLE_GOOGLE_LOGIN` (optional)

**Evidence Location**: 
- NextAuth route: `src/app/api/auth/[...nextauth]/route.ts`
- Auth handlers: `src/lib/auth` (file to check)

---

#### Ticket 6.1.2: Role Assignment UI
**Definition of Done**:
- Admin can assign roles to users
- Role assignment UI exists
- Roles are saved to `UserRole` table
- Role changes are logged

**Acceptance Tests**:
1. Login as admin
2. Open user/role management page
3. Assign role to user
4. Verify role is saved in database
5. Verify role change is logged
6. Verify user has correct permissions

**Rollback Plan**: Revert role assignment changes

**Flag Gating**: Feature flag `ENABLE_ROLE_SYSTEM` (optional)

**Evidence Location**: 
- Role model: `prisma/schema.prisma` Lines 463-495
- Role API: `src/app/api/roles/route.ts` (assumed)

---

#### Ticket 6.1.3: Permission Enforcement Boundaries
**Definition of Done**:
- Admin can set what roles can do
- Manager can set abilities for roles below them (but cannot exceed admin)
- Permission checks are enforced on protected routes
- Permission violations return 403

**Acceptance Tests**:
1. Login as admin
2. Set permissions for "manager" role
3. Login as manager
4. Verify manager can only set permissions for roles below manager
5. Verify manager cannot exceed admin permissions
6. Try to access restricted resource - verify 403 error

**Rollback Plan**: Revert permission enforcement changes

**Flag Gating**: Feature flag `ENABLE_PERMISSION_CHECKS` (exists in middleware)

**Evidence Location**: 
- Permission model: `prisma/schema.prisma` Lines 473-483
- Middleware: `src/middleware.ts` Line 22

---

## Priority 7: Payroll Automation

### Epic 7.1: Payroll System

#### Ticket 7.1.1: Commission Split Rules
**Definition of Done**:
- Commission split rules are configurable
- Rules define: sitter percentage, owner percentage, platform fee
- Rules can vary by service type or sitter tier
- Rules are applied when calculating earnings

**Acceptance Tests**:
1. Configure commission split: 80% sitter, 20% owner
2. Create booking with $100 total
3. Verify sitter earnings = $80
4. Verify owner earnings = $20
5. Test with different service types - verify rules apply

**Rollback Plan**: Revert commission calculation changes

**Flag Gating**: Feature flag `ENABLE_PAYROLL_AUTOMATION` (optional)

**Evidence Location**: 
- Commission field: `prisma/schema.prisma` Line 100 `commissionPercentage`

---

#### Ticket 7.1.2: Pay Period Breakdown
**Definition of Done**:
- Pay periods are defined (e.g., weekly, bi-weekly, monthly)
- Pay period breakdown shows:
  - Period start/end dates
  - Bookings in period
  - Total earnings
  - Commission breakdown
- Breakdown is viewable by owner and sitter

**Acceptance Tests**:
1. Set pay period to "weekly"
2. View pay period breakdown
3. Verify shows: dates, bookings, earnings, commission
4. Verify breakdown is accurate
5. View as sitter - verify sitter can see their breakdown

**Rollback Plan**: Revert pay period changes

**Flag Gating**: Feature flag `ENABLE_PAYROLL_AUTOMATION`

**Evidence Location**: 
- No pay period model found - needs creation

---

#### Ticket 7.1.3: Owner Approvals
**Definition of Done**:
- Owner can approve payouts
- Approval workflow exists
- Approved payouts are marked
- Approval history is logged

**Acceptance Tests**:
1. Generate pay period breakdown
2. Owner reviews breakdown
3. Owner approves payout
4. Verify payout is marked as approved
5. Verify approval is logged
6. Verify sitter can see approval status

**Rollback Plan**: Revert approval changes

**Flag Gating**: Feature flag `ENABLE_PAYROLL_AUTOMATION`

**Evidence Location**: 
- No approval model found - needs creation

---

#### Ticket 7.1.4: Sitter Payroll View
**Definition of Done**:
- Sitter can view their payroll
- View shows: pay periods, earnings, commission, payout status
- Sitter can see pending and paid payouts
- View is accessible from sitter dashboard

**Acceptance Tests**:
1. Login as sitter
2. Navigate to payroll view
3. Verify shows pay periods
4. Verify shows earnings and commission
5. Verify shows payout status
6. Verify view is readable on mobile

**Rollback Plan**: Revert payroll view changes

**Flag Gating**: Feature flag `ENABLE_PAYROLL_AUTOMATION`

**Evidence Location**: 
- Sitter dashboard: `src/app/sitter-dashboard/page.tsx`

---

#### Ticket 7.1.5: Payout Rail Decision
**Definition of Done**:
- Payout rail is chosen: Stripe Connect OR other
- Decision is documented
- Implementation plan is created
- Basic payout functionality works

**Acceptance Tests**:
1. Verify payout rail decision is documented
2. Verify implementation plan exists
3. Test payout flow (if implemented)
4. Verify payouts are processed correctly

**Rollback Plan**: N/A (decision document)

**Flag Gating**: Feature flag `ENABLE_PAYOUT_RAIL` (optional)

**Evidence Location**: 
- Stripe Connect: `prisma/schema.prisma` Line 107 `stripeAccountId` exists on Sitter

**Note**: User must make this decision.

---

## Priority 8: Stripe Price Mapping Editor

### Epic 8.1: Stripe Price ID Mapping

#### Ticket 8.1.1: Stripe Price ID Editor UI
**Definition of Done**:
- Editor exists in settings or pricing page
- Editor allows editing Stripe price ID per service
- Editor allows editing base rate per service
- Changes are saved to database

**Acceptance Tests**:
1. Open Stripe price mapping editor
2. Edit price ID for "Dog Walking" service
3. Edit base rate for "Dog Walking" service
4. Save changes
5. Verify changes are saved in database
6. Refresh page - verify changes persist

**Rollback Plan**: Revert editor changes

**Flag Gating**: Feature flag `ENABLE_STRIPE_PRICE_EDITOR` (optional)

**Evidence Location**: 
- Service config model: `prisma/schema.prisma` Lines 313-334 (no Stripe price ID field found)

---

#### Ticket 8.1.2: Future Bookings Use New Prices
**Definition of Done**:
- Changes to Stripe price IDs affect future bookings only
- Existing bookings keep their pricing snapshot
- New bookings use updated price IDs
- Price changes are logged

**Acceptance Tests**:
1. Edit Stripe price ID for service
2. Create new booking for that service
3. Verify new booking uses updated price ID
4. Verify existing bookings still have old price ID
5. Verify existing bookings' pricing snapshots unchanged
6. Verify price change is logged

**Rollback Plan**: Revert price mapping changes

**Flag Gating**: Feature flag `ENABLE_STRIPE_PRICE_EDITOR`

**Evidence Location**: 
- Pricing snapshot: `prisma/schema.prisma` Line 34 `pricingSnapshot` field

---

#### Ticket 8.1.3: Automations Reflect Updated Prices Immediately
**Definition of Done**:
- When price is updated, automations use new price immediately
- Payment link messages show updated price
- Tip calculations use updated price (if applicable)
- No caching of old prices in automations

**Acceptance Tests**:
1. Edit base rate for service
2. Trigger payment link automation
3. Verify message shows updated price
4. Create new booking - verify automation uses new price
5. Verify no old prices cached

**Rollback Plan**: Revert automation price logic changes

**Flag Gating**: Feature flag `ENABLE_STRIPE_PRICE_EDITOR`

**Evidence Location**: 
- Payment link automation: `src/lib/automation-executor.ts`
- Price calculation: Various pricing functions

---

## Summary

### Total Tickets: 45

**Priority 0 (Mobile)**: 7 tickets  
**Priority 1 (Revenue Critical)**: 4 tickets  
**Priority 2 (Tiers & Sitter)**: 7 tickets  
**Priority 3 (Automations)**: 11 tickets  
**Priority 4 (Messaging)**: 3 tickets  
**Priority 5 (Payments)**: 6 tickets  
**Priority 6 (Auth/Roles)**: 3 tickets  
**Priority 7 (Payroll)**: 5 tickets  
**Priority 8 (Stripe Pricing)**: 3 tickets

---

## Decision Required

**Messaging Architecture**: OpenPhone based or Twilio based?

**Current State**:
- OpenPhone integration exists: `src/lib/openphone.ts`
- OpenPhone API key in settings: `src/app/settings/page.tsx` Lines 262-274
- Sitter has `openphonePhone` field: `prisma/schema.prisma` Line 105
- Twilio integration: Not found in codebase

**Recommendation**: OpenPhone (already integrated, sitter phone fields exist)

**Please confirm**: OpenPhone or Twilio?

