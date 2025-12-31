# GATE A: BASELINE TRUTH
**Status:** COMPLETE  
**Date:** 2025-01-XX  
**Based on:** Forensic Audit Report

---

## 1. COMPLETE ROUTE AND PAGE INVENTORY WITH AUTH STATUS

### API Routes - ALL UNAUTHENTICATED (CRITICAL RISK)

#### Booking Routes
- `GET /api/bookings` - List all bookings → **NO AUTH**
- `POST /api/bookings` - Create booking → **NO AUTH**
- `GET /api/bookings/[id]` - Get booking → **NO AUTH**
- `PATCH /api/bookings/[id]` - Update booking → **NO AUTH**
- `GET /api/bookings/[id]/recommend-sitters` - Recommend sitters → **NO AUTH**
- `GET /api/bookings/[id]/check-conflicts` - Check conflicts → **NO AUTH**
- `GET /api/bookings/[id]/tags` - Get booking tags → **NO AUTH**
- `POST /api/bookings/[id]/tags` - Add tags → **NO AUTH**

#### Form Submission (Intentionally Public)
- `POST /api/form` - Booking form submission → **PUBLIC** (intended)
- `OPTIONS /api/form` - CORS preflight → **PUBLIC** (intended)

#### Sitter Routes
- `GET /api/sitters` - List all sitters → **NO AUTH**
- `POST /api/sitters` - Create sitter → **NO AUTH**
- `GET /api/sitters/[id]` - Get sitter → **NO AUTH**
- `PATCH /api/sitters/[id]` - Update sitter → **NO AUTH**
- `GET /api/sitters/[id]/dashboard` - Sitter dashboard data → **NO AUTH**
- `POST /api/sitters/[id]/dashboard/accept` - Accept pool job → **NO AUTH**
- `GET /api/sitters/[id]/conflicts` - Check conflicts → **NO AUTH**
- `GET /api/sitter/[id]/bookings` - Get sitter bookings → **NO AUTH**

#### Client Routes
- `GET /api/clients` - List all clients → **NO AUTH**
- `POST /api/clients` - Create client → **NO AUTH**
- `GET /api/clients/[id]` - Get client → **NO AUTH**
- `PATCH /api/clients/[id]` - Update client → **NO AUTH**

#### Automation Routes (ADMIN - SHOULD BE PROTECTED)
- `GET /api/automations` - List automations → **NO AUTH** ⚠️
- `POST /api/automations` - Create automation → **NO AUTH** ⚠️
- `GET /api/automations/[id]` - Get automation → **NO AUTH** ⚠️
- `PATCH /api/automations/[id]` - Update automation → **NO AUTH** ⚠️
- `DELETE /api/automations/[id]` - Delete automation → **NO AUTH** ⚠️
- `POST /api/automations/[id]/run` - Manually trigger → **NO AUTH** ⚠️
- `GET /api/automations/logs` - Get logs → **NO AUTH** ⚠️

#### Payment Routes (ADMIN - SHOULD BE PROTECTED)
- `POST /api/payments/create-payment-link` - Create payment link → **NO AUTH** ⚠️
- `POST /api/payments/create-tip-link` - Create tip link → **NO AUTH** ⚠️
- `POST /api/stripe/create-invoice` - Create invoice → **NO AUTH** ⚠️
- `GET /api/stripe/analytics` - Stripe analytics → **NO AUTH** ⚠️

#### Settings Routes (ADMIN - SHOULD BE PROTECTED)
- `GET /api/settings` - Get settings → **NO AUTH** ⚠️
- `GET /api/business-settings` - Get business settings → **NO AUTH** ⚠️
- `POST /api/business-settings` - Update business settings → **NO AUTH** ⚠️

#### Template Routes (ADMIN - SHOULD BE PROTECTED)
- `GET /api/templates` - List templates → **NO AUTH** ⚠️
- `POST /api/templates` - Create template → **NO AUTH** ⚠️
- `GET /api/templates/[id]` - Get template → **NO AUTH** ⚠️
- `PATCH /api/templates/[id]` - Update template → **NO AUTH** ⚠️
- `GET /api/message-templates` - List message templates → **NO AUTH** ⚠️
- `POST /api/message-templates` - Create template → **NO AUTH** ⚠️
- `POST /api/message-templates/restore` - Restore template → **NO AUTH** ⚠️

#### Pricing Routes (ADMIN - SHOULD BE PROTECTED)
- `GET /api/pricing-rules` - List pricing rules → **NO AUTH** ⚠️
- `POST /api/pricing-rules` - Create rule → **NO AUTH** ⚠️
- `GET /api/pricing-rules/[id]` - Get rule → **NO AUTH** ⚠️
- `PATCH /api/pricing-rules/[id]` - Update rule → **NO AUTH** ⚠️
- `GET /api/service-configs` - List service configs → **NO AUTH** ⚠️
- `POST /api/service-configs` - Create config → **NO AUTH** ⚠️
- `PATCH /api/service-configs/[id]` - Update config → **NO AUTH** ⚠️

#### Calendar Routes (ADMIN - SHOULD BE PROTECTED)
- `GET /api/calendar/accounts` - List accounts → **NO AUTH** ⚠️
- `POST /api/calendar/accounts` - Add account → **NO AUTH** ⚠️
- `POST /api/calendar/google-sync` - Sync calendar → **NO AUTH** ⚠️
- `GET /api/calendar/owner-events` - Get events → **NO AUTH** ⚠️

#### Webhook Routes (Public by nature, but should validate)
- `POST /api/webhooks/stripe` - Stripe webhook → **PUBLIC** (needs signature validation)
- `POST /api/webhooks/sms` - SMS webhook → **PUBLIC** (needs validation)

#### Utility Routes
- `GET /api/health` - Health check → **PUBLIC** (acceptable)
- `GET /api/roles` - List roles → **NO AUTH** ⚠️

### UI Pages - ALL UNAUTHENTICATED (CRITICAL RISK)

#### Owner/Admin Pages (SHOULD BE PROTECTED)
- `/app/page.tsx` - Homepage/dashboard → **NO AUTH** ⚠️
- `/app/bookings/page.tsx` - Main bookings dashboard → **NO AUTH** ⚠️
- `/app/bookings/sitters/page.tsx` - Sitter assignment view → **NO AUTH** ⚠️
- `/app/clients/page.tsx` - Client management → **NO AUTH** ⚠️
- `/app/payments/page.tsx` - Payments dashboard → **NO AUTH** ⚠️
- `/app/messages/page.tsx` - Messages dashboard → **NO AUTH** ⚠️
- `/app/calendar/page.tsx` - Calendar view → **NO AUTH** ⚠️
- `/app/settings/page.tsx` - Settings hub → **NO AUTH** ⚠️
- `/app/settings/business/page.tsx` - Business settings → **NO AUTH** ⚠️
- `/app/settings/pricing/page.tsx` - Pricing settings → **NO AUTH** ⚠️
- `/app/settings/services/page.tsx` - Service config → **NO AUTH** ⚠️
- `/app/settings/tiers/page.tsx` - Tier management → **NO AUTH** ⚠️
- `/app/settings/discounts/page.tsx` - Discount management → **NO AUTH** ⚠️
- `/app/settings/custom-fields/page.tsx` - Custom fields → **NO AUTH** ⚠️
- `/app/settings/form-builder/page.tsx` - Form builder → **NO AUTH** ⚠️
- `/app/automation-center/page.tsx` - Automation center → **NO AUTH** ⚠️
- `/app/automation-center/new/page.tsx` - New automation → **NO AUTH** ⚠️
- `/app/automation-center/[id]/page.tsx` - Edit automation → **NO AUTH** ⚠️
- `/app/templates/page.tsx` - Template management → **NO AUTH** ⚠️
- `/app/templates/[id]/page.tsx` - Edit template → **NO AUTH** ⚠️
- `/app/integrations/page.tsx` - Integrations → **NO AUTH** ⚠️

#### Sitter Pages (SHOULD BE PROTECTED)
- `/app/sitter/page.tsx` - Basic sitter view → **NO AUTH** ⚠️
- `/app/sitter-dashboard/page.tsx` - Comprehensive sitter dashboard → **NO AUTH** ⚠️

#### Public Pages (Acceptable)
- `/public/booking-form.html` - Booking form → **PUBLIC** (intended)

#### Tip Pages (May need protection or remain public)
- `/app/tip/*` - Tip payment pages → **PUBLIC** (may be acceptable for payment flows)

---

## 2. COMPLETE PRICING LOGIC MAP

### Pricing Calculation Functions

#### 1. `calculateBookingPrice()` - Creation Time
- **Location:** `src/lib/rates.ts`
- **Called From:** 
  - `src/app/api/form/route.ts` (line ~318) - During booking creation
  - `src/app/api/bookings/route.ts` (line ~137) - During booking creation
- **Logic:** Uses `computeQuote()` with DEFAULT_RATES
- **Output:** Single `total` value
- **Stored:** `booking.totalPrice` field
- **Status:** ACTIVE - Used during booking creation

#### 2. `calculatePriceBreakdown()` - Display Time
- **Location:** `src/lib/booking-utils.ts`
- **Called From:**
  - `src/app/bookings/page.tsx` - Booking details modal display
  - `src/lib/automation-engine.ts` (line ~405) - Template variable building
  - `src/lib/sms-templates.ts` - SMS message formatting
  - `src/lib/automation-utils.ts` - Template replacement
  - `src/app/sitter-dashboard/page.tsx` - Sitter earnings display
- **Logic:** Recalculates from booking data using DEFAULT_RATES
- **Output:** Breakdown object with `basePrice`, `breakdown[]`, `total`
- **Stored:** NOT stored, recalculated on-demand
- **Status:** ACTIVE - Used for all display surfaces

#### 3. `calculatePriceWithRules()` - DEAD CODE
- **Location:** `src/lib/pricing-engine.ts`
- **Called From:** NOWHERE
- **Logic:** Evaluates PricingRule models from database
- **Output:** PricingResult with fees, discounts, multipliers
- **Status:** DEAD CODE - Never invoked

### Pricing Data Sources

#### DEFAULT_RATES (Hardcoded)
- **Location:** `src/lib/rates.ts` (line ~133)
- **Content:**
  ```typescript
  "Drop-ins": { base: 20, base60: 32, addlPet: 5, holidayAdd: 10 }
  "Dog Walking": { base: 20, base60: 32, addlPet: 5, holidayAdd: 10 }
  "Housesitting": { base: 80, addlPet: 10, holidayAdd: 25 }
  "Pet Taxi": { base: 20, addlPet: 5, holidayAdd: 10 }
  "24/7 Care": { base: 100, addlPet: 15, holidayAdd: 30 }
  ```
- **Used By:** `calculateBookingPrice()`, `calculatePriceBreakdown()`
- **Status:** ACTIVE - Currently in use

#### Rate Model (Database)
- **Location:** `prisma/schema.prisma` (Rate model)
- **Used By:** `getAllRates()` function (exists but usage unclear)
- **Status:** UNCERTAIN - May not be actively used

#### PricingRule Model (Database)
- **Location:** `prisma/schema.prisma` (PricingRule model)
- **Used By:** `calculatePriceWithRules()` - BUT THIS IS DEAD CODE
- **Status:** DEAD CODE - Rules can be created but never evaluated

### Pricing Calculation Call Sites

#### Booking Creation Flow
1. **Form Submission:** `/api/form` → `calculateBookingPrice()` → stores `totalPrice`
2. **Direct API:** `/api/bookings` (POST) → `calculateBookingPrice()` → stores `totalPrice`

#### Display Flow (Recalculated)
1. **Booking Details Modal:** `calculatePriceBreakdown()` → displays breakdown
2. **Calendar View:** Uses stored `totalPrice` (may diverge from breakdown)
3. **Sitter Dashboard:** `calculatePriceBreakdown()` → displays earnings
4. **SMS Messages:** `calculatePriceBreakdown()` → includes total in message
5. **Automation Templates:** `calculatePriceBreakdown()` → variable replacement

### Pricing Divergence Points

#### CRITICAL DIVERGENCE #1: Creation vs Display
- **Creation:** `calculateBookingPrice()` uses `computeQuote()` with simple logic
- **Display:** `calculatePriceBreakdown()` has more complex timeSlot handling
- **Risk:** Stored `totalPrice` may not match displayed breakdown
- **Evidence:** Different calculation paths, different complexity

#### CRITICAL DIVERGENCE #2: TimeSlot Handling
- **Creation:** May not properly handle multiple timeSlots with different durations
- **Display:** Explicitly handles 30min vs 60min slots separately
- **Risk:** Multi-slot bookings may have incorrect stored totals

#### CRITICAL DIVERGENCE #3: Pricing Rules Not Applied
- **Database:** PricingRule records exist
- **Code:** `calculatePriceWithRules()` exists
- **Reality:** Never called, rules ignored
- **Risk:** Users create rules expecting them to work, but they don't

### Pricing Surface Inventory

| Surface | Calculation Method | Data Source | Divergence Risk |
|---------|-------------------|-------------|----------------|
| Booking Form (quote) | `calculateBookingPrice()` | DEFAULT_RATES | Medium - may not match final |
| Booking Details Modal | `calculatePriceBreakdown()` | Recalculated | High - may not match stored |
| Calendar View | Stored `totalPrice` | Database | High - may not match breakdown |
| Sitter Dashboard | `calculatePriceBreakdown()` | Recalculated | High - may not match stored |
| SMS Messages | `calculatePriceBreakdown()` | Recalculated | High - may not match stored |
| Revenue Stats | Stored `totalPrice` | Database | High - may be incorrect |

---

## 3. COMPLETE AUTOMATION SYSTEM MAP

### Automation Triggers (Events)

#### Active Triggers (Emitted)
- `booking.created` - Emitted from `/api/form` after booking creation
- `booking.updated` - Emitted from booking PATCH operations
- `booking.status.changed` - Emitted when status changes
- `sitter.assigned` - Emitted when sitter assigned to booking
- `booking.assigned` - Alias for sitter.assigned
- `sitter.unassigned` - Emitted when sitter removed
- `payment.success` - Emitted (location unclear, may be webhook)
- `payment.failed` - Emitted (location unclear)
- `visit.completed` - Emitted (location unclear)
- `client.created` - Emitted (location unclear)
- `sitter.tier.changed` - Emitted (location unclear)
- `custom` - Custom event type

#### Trigger Emission Locations
- **Event Emitter:** `src/lib/event-emitter.ts`
- **Booking Creation:** `src/app/api/form/route.ts` → `emitBookingCreated()`
- **Booking Update:** `src/app/api/bookings/[id]/route.ts` → `emitBookingUpdated()`
- **Sitter Assignment:** `src/app/api/bookings/[id]/route.ts` → `emitSitterAssigned()`
- **Sitter Pool Acceptance:** `src/app/api/sitters/[id]/dashboard/accept/route.ts` → `emitSitterAssigned()`

### Automation Conditions (Operators)

#### Active Operators
- `equals` - String/number equality
- `notEquals` - Inequality
- `contains` - String contains (case insensitive)
- `notContains` - String does not contain
- `greaterThan` - Numeric comparison
- `lessThan` - Numeric comparison
- `greaterThanOrEqual` - Numeric comparison
- `lessThanOrEqual` - Numeric comparison
- `in` - Value in array
- `notIn` - Value not in array
- `isEmpty` - Value is empty/null
- `isNotEmpty` - Value has content

#### Condition Logic
- AND/OR logic between conditions
- Logic stored per condition via `logic` field

### Automation Actions

#### ACTIVE Actions (Fully Implemented)
1. **sendSMS**
   - **Status:** ✅ FULLY IMPLEMENTED
   - **Location:** `src/lib/automation-engine.ts` → `executeSendSMS()`
   - **Capability:** Sends SMS via OpenPhone integration
   - **Recipients:** client, sitter, owner
   - **Template Support:** Yes, with variable replacement

2. **updateBookingStatus**
   - **Status:** ✅ FULLY IMPLEMENTED
   - **Location:** `src/lib/automation-engine.ts` → `executeUpdateBookingStatus()`
   - **Capability:** Updates booking.status field directly

3. **assignSitter**
   - **Status:** ✅ FULLY IMPLEMENTED
   - **Location:** `src/lib/automation-engine.ts` → `executeAssignSitter()`
   - **Capability:** Sets booking.sitterId directly

4. **unassignSitter**
   - **Status:** ✅ FULLY IMPLEMENTED
   - **Location:** `src/lib/automation-engine.ts` → `executeUnassignSitter()`
   - **Capability:** Clears booking.sitterId

5. **notifyOwner**
   - **Status:** ✅ FULLY IMPLEMENTED
   - **Location:** `src/lib/automation-engine.ts` → `executeNotifyOwner()`
   - **Capability:** Sends SMS to owner phone

#### STUB Actions (Return Errors)
6. **sendEmail**
   - **Status:** ❌ STUB - Returns error
   - **Location:** `src/lib/automation-engine.ts` → `executeSendEmail()`
   - **Code:** `return { success: false, error: "Email sending not yet implemented" }`

7. **applyFee**
   - **Status:** ❌ STUB - Returns error
   - **Location:** `src/lib/automation-engine.ts` → `executeApplyFee()`
   - **Code:** `return { success: false, error: "Fee application not yet implemented" }`

8. **applyDiscount**
   - **Status:** ❌ STUB - Returns error
   - **Location:** `src/lib/automation-engine.ts` → `executeApplyDiscount()`
   - **Code:** `return { success: false, error: "Discount application not yet implemented" }`

9. **createInternalTask**
   - **Status:** ❌ STUB - Returns error
   - **Location:** `src/lib/automation-engine.ts` → `executeCreateInternalTask()`
   - **Code:** Returns error

10. **requestReview**
    - **Status:** ❌ STUB - Returns error
    - **Location:** `src/lib/automation-engine.ts` → `executeRequestReview()`
    - **Code:** Returns error

11. **toggleSitterAvailability**
    - **Status:** ❌ STUB - Returns error
    - **Location:** `src/lib/automation-engine.ts` → `executeToggleSitterAvailability()`
    - **Code:** Returns error

12. **writeInternalNote**
    - **Status:** ❌ STUB - Returns error
    - **Location:** `src/lib/automation-engine.ts` → `executeWriteInternalNote()`
    - **Code:** Returns error

#### UNCERTAIN Actions
13. **pushCalendarUpdate**
    - **Status:** ⚠️ PARTIAL
    - **Location:** `src/lib/automation-engine.ts` → `executePushCalendarUpdate()`
    - **Code:** Exists but uncertain if Google Calendar integration works

14. **fireWebhook**
    - **Status:** ⚠️ PARTIAL
    - **Location:** `src/lib/automation-engine.ts` → `executeFireWebhook()`
    - **Code:** Exists but uncertain if webhook firing works

### Automation Persistence

#### Storage
- **Model:** `Automation` (Prisma)
- **Location:** `prisma/schema.prisma`
- **Fields:** id, name, description, trigger, enabled, priority
- **Relations:** AutomationCondition[], AutomationAction[], AutomationLog[]

#### Persistence API
- **Create:** `POST /api/automations` → Creates with conditions and actions
- **Update:** `PATCH /api/automations/[id]` → Updates automation
- **Delete:** `DELETE /api/automations/[id]` → Deletes automation
- **Status:** ✅ ACTIVE - Changes persist to database

#### Execution Flow
1. Event emitted via `eventEmitter.emit()`
2. `processAutomations()` called (from automation-engine.ts)
3. Query database for enabled automations matching trigger
4. Evaluate conditions
5. Execute actions if conditions pass
6. Log results to AutomationLog

#### Initialization
- **Auto-initialization:** Via `src/lib/db.ts` → imports `automation-init.ts`
- **Event Handler Registration:** `initializeAutomationEngine()` sets up event listeners
- **Status:** ✅ ACTIVE - Automations execute at runtime

### Automation Execution Logs

#### Logging
- **Model:** `AutomationLog` (Prisma)
- **Fields:** id, automationId, trigger, context, conditions, actions, success, error, executedAt
- **Storage:** All execution attempts logged
- **API:** `GET /api/automations/logs` - View logs

### Automation Persistence Bug Status

#### Current Behavior
- **User Report:** "Settings appear to save but don't actually change"
- **Reality Check:** API routes DO save to database (verified in code)
- **Possible Causes:**
  1. Frontend may not refresh after save
  2. Automation engine may cache old definitions
  3. Event handlers may be registered with old definitions
- **Status:** UNCERTAIN - Code shows persistence works, but user experience suggests otherwise

---

## 4. DATA MODEL MAP

### Authoritative Tables (Core Domain)

#### Organization
- **Model:** NOT PRESENT
- **Status:** MISSING - No org model exists
- **Impact:** Cannot enforce org scoping

#### User
- **Model:** NOT PRESENT (only Sitter exists)
- **Status:** MISSING - No user model exists
- **Impact:** Cannot implement auth system

#### Sitter
- **Model:** `Sitter` (Prisma)
- **Fields:** id, firstName, lastName, phone, email, active, commissionPercentage, currentTierId, stripeAccountId
- **Relations:** bookings, sitterPoolOffers, tierHistory, currentTier, customFields
- **Status:** ✅ ACTIVE - Core entity

#### Client
- **Model:** `Client` (Prisma)
- **Fields:** id, firstName, lastName, phone, email, address, tags, lifetimeValue, lastBookingAt, notes
- **Relations:** bookings, customFields
- **Status:** ✅ ACTIVE - Core entity

#### Booking
- **Model:** `Booking` (Prisma)
- **Fields:** id, firstName, lastName, phone, email, address, service, startAt, endAt, totalPrice, status, assignmentType, notes, paymentStatus, sitterId, clientId
- **Relations:** pets, sitter, timeSlots, messages, reports, sitterPoolOffers, client, tags, discountUsage, customFields
- **Status:** ✅ ACTIVE - Core entity
- **Authoritative For:** Booking state, pricing (stored totalPrice)

#### Pet
- **Model:** `Pet` (Prisma)
- **Fields:** id, name, species, breed, age, notes, bookingId
- **Relations:** booking, customFields
- **Status:** ✅ ACTIVE - Core entity

#### TimeSlot
- **Model:** `TimeSlot` (Prisma)
- **Fields:** id, startAt, endAt, duration, bookingId
- **Relations:** booking
- **Status:** ✅ ACTIVE - Used for visit-based services

### Pricing Tables

#### Rate
- **Model:** `Rate` (Prisma)
- **Fields:** id, service, duration, baseRate
- **Status:** ⚠️ UNCERTAIN - Model exists but DEFAULT_RATES hardcoded may be used instead

#### PricingRule
- **Model:** `PricingRule` (Prisma)
- **Fields:** id, name, description, type, conditions, calculation, priority, enabled
- **Status:** ❌ DEAD CODE - Model exists but rules never evaluated

#### ServiceConfig
- **Model:** `ServiceConfig` (Prisma)
- **Fields:** id, serviceName, basePrice, defaultDuration, category, minBookingNotice, gpsCheckInRequired, photosRequired, weekendMultiplier, holidayMultiplier, enabled
- **Status:** ⚠️ UNCERTAIN - Model exists but usage unclear

### Payment Tables

#### Payment (Stripe)
- **Model:** NOT PRESENT
- **Status:** MISSING - No payment model exists
- **Impact:** Payment tracking relies on Stripe webhook and booking.paymentStatus

#### Invoice
- **Model:** NOT PRESENT (Stripe invoices handled externally)
- **Status:** N/A

### Automation Tables

#### Automation
- **Model:** `Automation` (Prisma)
- **Fields:** id, name, description, trigger, enabled, priority
- **Relations:** conditions, actions, logs
- **Status:** ✅ ACTIVE - Authoritative source for automation definitions

#### AutomationCondition
- **Model:** `AutomationCondition` (Prisma)
- **Fields:** id, automationId, field, operator, value, logic, order
- **Status:** ✅ ACTIVE - Stored conditions

#### AutomationAction
- **Model:** `AutomationAction` (Prisma)
- **Fields:** id, automationId, type, config, order, delayMinutes
- **Status:** ✅ ACTIVE - Stored actions

#### AutomationLog
- **Model:** `AutomationLog` (Prisma)
- **Fields:** id, automationId, trigger, context, conditions, actions, success, error, executedAt
- **Status:** ✅ ACTIVE - Execution logs

### Message Tables

#### Message
- **Model:** `Message` (Prisma)
- **Fields:** id, direction, from, to, body, status, bookingId
- **Relations:** booking
- **Status:** ✅ ACTIVE - Message log

#### MessageTemplate
- **Model:** `MessageTemplate` (Prisma)
- **Fields:** id, name, type, category, templateKey, subject, body, variables, version, isActive
- **Relations:** history
- **Status:** ✅ ACTIVE - Template storage

### Sitter Tier Tables

#### SitterTier
- **Model:** `SitterTier` (Prisma)
- **Fields:** id, name, pointTarget, minCompletionRate, minResponseRate, benefits, priorityLevel, canTakeHouseSits, canTakeTwentyFourHourCare, isDefault
- **Relations:** sitters, tierHistory
- **Status:** ✅ ACTIVE - Tier definitions

#### SitterTierHistory
- **Model:** `SitterTierHistory` (Prisma)
- **Fields:** id, sitterId, tierId, points, completionRate, responseRate, periodStart, periodEnd
- **Status:** ✅ ACTIVE - Tier history tracking

### Settings Tables

#### Setting
- **Model:** `Setting` (Prisma)
- **Fields:** id, key, value, category, label
- **Status:** ✅ ACTIVE - Key-value settings

#### BusinessSettings
- **Model:** `BusinessSettings` (Prisma)
- **Fields:** id, businessName, businessPhone, businessEmail, businessAddress, timeZone, operatingHours, holidays, taxSettings, contentBlocks
- **Status:** ✅ ACTIVE - Business configuration

### Other Tables

#### CustomField
- **Model:** `CustomField` (Prisma)
- **Status:** ✅ ACTIVE

#### CustomFieldValue
- **Model:** `CustomFieldValue` (Prisma)
- **Status:** ✅ ACTIVE

#### Discount
- **Model:** `Discount` (Prisma)
- **Status:** ✅ ACTIVE - Discount definitions

#### DiscountUsage
- **Model:** `DiscountUsage` (Prisma)
- **Status:** ✅ ACTIVE - Discount application tracking

#### BookingTag
- **Model:** `BookingTag` (Prisma)
- **Status:** ✅ ACTIVE

#### BookingTagAssignment
- **Model:** `BookingTagAssignment` (Prisma)
- **Status:** ✅ ACTIVE

#### FormField
- **Model:** `FormField` (Prisma)
- **Status:** ✅ ACTIVE - Form builder fields

#### Report
- **Model:** `Report` (Prisma)
- **Fields:** id, bookingId, content, mediaUrls, visitStarted, visitCompleted
- **Status:** ✅ ACTIVE - Visit reports

#### SitterPoolOffer
- **Model:** `SitterPoolOffer` (Prisma)
- **Fields:** id, bookingId, sitterId, sitterIds, message, expiresAt, status, responses, acceptedSitterId
- **Status:** ✅ ACTIVE - Sitter pool system

#### Role
- **Model:** `Role` (Prisma)
- **Fields:** id, name, displayName
- **Relations:** permissions, users
- **Status:** ❌ DEAD CODE - Model exists but never used

#### RolePermission
- **Model:** `RolePermission` (Prisma)
- **Status:** ❌ DEAD CODE - Model exists but never used

#### UserRole
- **Model:** `UserRole` (Prisma)
- **Status:** ❌ DEAD CODE - Model exists but never used

---

## 5. PRIORITIZED RISK LIST

### Top 10 Revenue Breaking Risks

1. **Pricing Calculation Divergence** (CRITICAL)
   - **Risk:** Stored `totalPrice` may not match displayed breakdown
   - **Impact:** Incorrect revenue tracking, customer confusion, potential refunds
   - **Evidence:** Two different calculation paths, complex timeSlot handling differences
   - **Mitigation:** Unify to single pricing engine, snapshot at creation

2. **No Payment Status Tracking** (CRITICAL)
   - **Risk:** Payment status may not update after Stripe webhook
   - **Impact:** Unpaid bookings marked as paid, or vice versa
   - **Evidence:** No Payment model, reliance on booking.paymentStatus and webhook
   - **Mitigation:** Verify webhook processing, add Payment model

3. **Pricing Rules Not Applied** (HIGH)
   - **Risk:** Users create pricing rules expecting them to work
   - **Impact:** Incorrect quotes, customer complaints
   - **Evidence:** PricingRule model exists but `calculatePriceWithRules()` never called
   - **Mitigation:** Either wire rules engine or remove UI for creating rules

4. **Discount Application Uncertain** (HIGH)
   - **Risk:** Discounts may not apply during booking creation
   - **Impact:** Incorrect pricing, manual refunds required
   - **Evidence:** Discount API exists but wiring to booking creation unclear
   - **Mitigation:** Verify discount application flow, add tests

5. **Automation Persistence Bug** (MEDIUM)
   - **Risk:** Automation settings may not persist correctly
   - **Impact:** Automations don't work as configured, missed messages
   - **Evidence:** User reports settings don't save (code suggests they do)
   - **Mitigation:** Add verification, fix caching if exists

6. **Background Jobs May Not Run** (MEDIUM)
   - **Risk:** Reminders and summaries may not send
   - **Impact:** Missed customer communications, poor service
   - **Evidence:** Worker initialization depends on Redis, silent failures
   - **Mitigation:** Add health checks, fallback mechanisms

7. **Stored TotalPrice vs Calculated** (MEDIUM)
   - **Risk:** Display shows different total than stored
   - **Impact:** Revenue reports incorrect, customer confusion
   - **Evidence:** All displays use `calculatePriceBreakdown()`, revenue uses stored
   - **Mitigation:** Use single source, always recalculate or always use stored

8. **Booking Form Quote Accuracy** (MEDIUM)
   - **Risk:** Quote shown to customer may not match final price
   - **Impact:** Customer complaints, refunds
   - **Evidence:** Form uses `calculateBookingPrice()`, display uses `calculatePriceBreakdown()`
   - **Mitigation:** Use same calculation for quote and final

9. **Payment Link Creation Unprotected** (LOW)
   - **Risk:** Anyone can create payment links
   - **Impact:** Potential fraud, incorrect payment links
   - **Evidence:** `/api/payments/create-payment-link` has no auth
   - **Mitigation:** Add auth to payment routes

10. **Sitter Pool Race Condition** (LOW)
    - **Risk:** Multiple sitters may accept same pool job
    - **Impact:** Double assignment, customer confusion
    - **Evidence:** Atomic acceptance exists but should verify
    - **Mitigation:** Verify transaction isolation

### Top 10 Security Risks

1. **Complete Lack of Authentication** (CRITICAL)
   - **Risk:** All dashboards and APIs publicly accessible
   - **Impact:** Data breach, data modification, service disruption
   - **Evidence:** No auth middleware, all routes public
   - **Mitigation:** Implement auth system immediately (Gate B)

2. **All Client PII Exposed** (CRITICAL)
   - **Risk:** Phone numbers, addresses, emails accessible without auth
   - **Impact:** Privacy violation, GDPR issues, customer trust loss
   - **Evidence:** `/api/clients`, `/api/bookings` return full PII
   - **Mitigation:** Add auth + role-based access control

3. **Stripe Operations Unprotected** (CRITICAL)
   - **Risk:** Anyone can create invoices, view analytics, access Stripe data
   - **Impact:** Financial fraud, data breach
   - **Evidence:** `/api/stripe/*` routes have no auth
   - **Mitigation:** Add auth to Stripe routes

4. **Automation System Unprotected** (CRITICAL)
   - **Risk:** Anyone can create/modify/delete automations, trigger manually
   - **Impact:** Service disruption, spam messages, data corruption
   - **Evidence:** `/api/automations/*` routes have no auth
   - **Mitigation:** Add auth + admin role requirement

5. **Settings Modification Unprotected** (CRITICAL)
   - **Risk:** Anyone can modify business settings, pricing, service configs
   - **Impact:** Service disruption, incorrect pricing, data corruption
   - **Evidence:** `/api/settings/*`, `/api/pricing-rules/*` have no auth
   - **Mitigation:** Add auth + admin role requirement

6. **Sitter Data Exposed** (HIGH)
   - **Risk:** All sitter information accessible, including phone numbers
   - **Impact:** Privacy violation, harassment risk
   - **Evidence:** `/api/sitters` returns full sitter data
   - **Mitigation:** Add auth + role-based access control

7. **Message History Exposed** (HIGH)
   - **Risk:** All SMS/email history accessible
   - **Impact:** Privacy violation, customer trust loss
   - **Evidence:** `/app/messages/page.tsx` shows all messages
   - **Mitigation:** Add auth + role-based access control

8. **No Rate Limiting** (MEDIUM)
   - **Risk:** API abuse, DDoS, brute force attacks
   - **Impact:** Service disruption, cost overruns
   - **Evidence:** No rate limiting middleware
   - **Mitigation:** Add rate limiting to auth endpoints

9. **Webhook Validation Uncertain** (MEDIUM)
   - **Risk:** Webhook endpoints may accept unverified requests
   - **Impact:** Fake payment confirmations, data corruption
   - **Evidence:** Webhook handlers exist but validation unclear
   - **Mitigation:** Verify Stripe signature validation, SMS webhook validation

10. **No Audit Logging** (MEDIUM)
    - **Risk:** Cannot track who made changes, when, or what
    - **Impact:** Cannot detect breaches, cannot comply with regulations
    - **Evidence:** No audit log model or logging
    - **Mitigation:** Add audit logging for sensitive operations

---

## GATE A PASS CRITERIA CHECKLIST

- ✅ Complete route and page inventory with auth status
- ✅ Complete pricing logic map with call sites and divergence points
- ✅ Complete automation system map with trigger/condition/action inventory
- ✅ Data model map showing authoritative tables
- ✅ Prioritized risk lists (revenue + security)

**GATE A STATUS: ✅ COMPLETE**

Proceed to Gate B: Security Containment.

