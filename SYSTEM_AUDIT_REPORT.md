# System Audit Report - Snout OS

**Date**: 2024-12-30  
**Type**: Factual Engineering Audit  
**Purpose**: Determine current system state and safe next action

---

## 1. SYSTEM STATE SUMMARY

### Phase 1: Form to Dashboard Wiring Map
- **Status**: IMPLEMENTED (NOT VERIFIED)
- **Proof**: 
  - `src/lib/form-to-booking-mapper.ts` exists
  - `src/lib/validation/form-booking.ts` exists
  - `src/app/api/form/route.ts` includes mapper integration (lines 12-13, conditional logic present)
  - Unit tests: `src/lib/__tests__/form-to-booking-mapper.test.ts`
  - Integration tests: `src/app/api/__tests__/form-route-integration.test.ts`
- **Feature Flag**: `ENABLE_FORM_MAPPER_V1` (default: false per `src/lib/env.ts`)
- **Verification Status**: NOT VERIFIED (per `PHASE_1_ACCEPTANCE_CHECKLIST.md` status: "NOT VERIFIED")

### Phase 2: Pricing Unification
- **Status**: IMPLEMENTED (NOT ACTIVATED)
- **Proof**:
  - `src/lib/pricing-engine-v1.ts` exists
  - `src/lib/pricing-parity-harness.ts` exists
  - `src/lib/pricing-snapshot-helpers.ts` exists
  - `prisma/schema.prisma` includes `pricingSnapshot String? @db.Text` field on Booking model
  - `PHASE_2_VERIFICATION.md` exists
- **Feature Flag**: `USE_PRICING_ENGINE_V1` (default: false per `src/lib/env.ts`)
- **Note**: Engine exists but not activated via flag

### Phase 3: Automation Persistence and Execution Truth
- **Status**: COMPLETE
- **Proof**:
  - `src/lib/automation-queue.ts` exists
  - `src/worker/automation-worker.ts` exists
  - `src/app/settings/automations/ledger/page.tsx` exists
  - `prisma/schema.prisma` includes `EventLog` model
  - `PHASE_3_COMPLETE.md` exists
- **Feature Flags**: None (automation queue always active)

### Phase 4: Secure the System
- **Status**: IMPLEMENTED (NOT ACTIVATED)
- **Proof**:
  - `src/middleware.ts` exists with auth protection logic
  - `src/lib/auth-helpers.ts` exists
  - `src/lib/public-routes.ts` exists
  - `src/lib/protected-routes.ts` exists
  - NextAuth v5 configured
- **Feature Flags**: 
  - `ENABLE_AUTH_PROTECTION` (default: false)
  - `ENABLE_PERMISSION_CHECKS` (default: false)
  - `ENABLE_WEBHOOK_VALIDATION` (default: false)
  - `ENABLE_SITTER_AUTH` (default: false)

### Phase 5: Sitter Tiers and Dashboards
- **Status**: COMPLETE
- **Proof**:
  - `src/app/sitter/page.tsx` exists
  - `src/lib/tier-rules.ts` exists
  - `prisma/schema.prisma` includes `SitterTier` and `SitterTierHistory` models
  - `src/app/api/sitter/[id]/earnings/route.ts` exists
  - `PHASE_5_COMPLETE_SUMMARY.md` exists

### Phase 6: Owner Click Reduction
- **Status**: COMPLETE
- **Proof**:
  - `src/app/bookings/TodayBoard.tsx` exists (one-click actions)
  - `src/app/api/exceptions/route.ts` exists
  - Booking confirmed automation on Stripe payment success (implemented)
  - `PHASE_6_COMPLETE_SUMMARY.md` exists

### Phase 7: Priority Gaps
- **Status**: COMPLETE
- **Proof**:
  - `src/lib/pricing-reconciliation.ts` exists (Phase 7.2)
  - `src/worker/reconciliation-worker.ts` exists
  - `src/lib/booking-status-history.ts` exists (Phase 7.3)
  - `src/app/api/bookings/[id]/status-history/route.ts` exists
  - `PHASE_7_PRIORITY_GAPS_COMPLETE.md` exists

### Section 9.1: Health Endpoint
- **Status**: COMPLETE
- **Proof**:
  - `src/lib/health-checks.ts` exists
  - `src/app/api/health/route.ts` includes comprehensive checks
  - `SECTION_9_1_HEALTH_ENDPOINT_COMPLETE.md` exists

### Section 12.2.5: Session Management
- **Status**: PARTIAL
- **Proof**:
  - `src/app/api/sessions/route.ts` exists (session inventory)
  - `src/app/api/sessions/[sessionId]/route.ts` exists (session revoke)
  - `src/app/api/sessions/audit/route.ts` exists (audit reporting)
  - Impersonation NOT implemented (per `DEVIATION_BACKLOG.md`)
  - `SECTION_12_2_5_SESSIONS_COMPLETE.md` exists

### Section 12.3.4: Automation Templates
- **Status**: COMPLETE
- **Proof**:
  - `src/lib/automation-templates.ts` exists with 7 templates
  - `src/app/api/automations/templates/route.ts` exists
  - `src/app/automation-center/page.tsx` includes template gallery
  - `SECTION_12_3_4_TEMPLATES_COMPLETE.md` exists

### Section 8.2: Next 7 Days Capacity
- **Status**: COMPLETE
- **Proof**:
  - `src/app/api/capacity/route.ts` exists
  - `SECTION_8_2_CAPACITY_COMPLETE.md` exists

### Section 8.3: Client Success
- **Status**: COMPLETE
- **Proof**:
  - `src/app/api/client-success/route.ts` exists
  - `SECTION_8_3_CLIENT_SUCCESS_COMPLETE.md` exists

---

## 2. EXECUTION GATES STATUS

### Gate A: Baseline Truth
- **Status**: NOT MAINTAINED
- **Evidence**: No current `GATE_A_BASELINE_TRUTH.md` update found. Master spec requires: "Gate A Baseline Truth must remain updated when major modules change."
- **Blocking**: YES (per Master Spec Section 11.1)

### Gate B: Security Containment
- **Status**: IMPLEMENTED (NOT ACTIVATED)
- **Evidence**:
  - `src/middleware.ts` implements redirects
  - `ENABLE_AUTH_PROTECTION=false` (default)
  - `ENABLE_PERMISSION_CHECKS=false` (default)
  - `ENABLE_WEBHOOK_VALIDATION=false` (default)
- **Phases Completed**: Implementation complete, activation pending
- **Blocking**: YES (per Master Spec Section 11.2: "Gate B Security Containment must be enabled and verified before any expansion of surfaces")

### Phase 1 Form Mapper
- **Status**: IMPLEMENTED / NOT VERIFIED
- **Evidence**:
  - Code exists and integrated in `src/app/api/form/route.ts`
  - Feature flag `ENABLE_FORM_MAPPER_V1=false` (default)
  - `PHASE_1_ACCEPTANCE_CHECKLIST.md` status: "NOT VERIFIED"
  - No evidence of 5-booking staging verification completion
- **Blocking**: YES (explicit requirement: "Phase 1 staging verification with 5 bookings must pass before proceeding")

### Gates That BLOCK Forward Execution:
1. **Phase 1 Staging Verification** - NOT VERIFIED (explicit blocker)
2. **Gate B Security Containment** - NOT ACTIVATED (per Master Spec 11.2, blocks expansion)
3. **Gate A Baseline Truth** - NOT MAINTAINED (per Master Spec 11.1)

---

## 3. FEATURE INVENTORY (FACTUAL)

### Booking Intake (form → API → DB → dashboard)
- **Status**: WORKS (baseline path)
- **Evidence**:
  - `src/app/api/form/route.ts` exists and handles POST requests
  - Form payload accepted, validated, persisted to DB
  - Bookings appear in dashboard (`src/app/bookings/page.tsx`)
  - Public allowlist maintained (`src/lib/public-routes.ts`)
- **New Path (Phase 1)**: IMPLEMENTED but NOT ACTIVATED (behind `ENABLE_FORM_MAPPER_V1=false`)

### Pricing
- **Status**: MULTIPLE PATHS EXIST
- **Evidence**:
  - Old path: `src/lib/rates.ts` - `calculateBookingPrice()` function
  - Old path: `src/lib/pricing-engine.ts` - `calculatePriceWithRules()` function
  - New path: `src/lib/pricing-engine-v1.ts` - `calculateCanonicalPricing()` function
  - Parity harness: `src/lib/pricing-parity-harness.ts` exists
  - Feature flag: `USE_PRICING_ENGINE_V1=false` (default)
- **Divergence Points**: Multiple pricing calculation functions exist simultaneously
- **Snapshot Storage**: Schema supports `pricingSnapshot` field, but flag not activated

### Automations
- **Actions Implemented** (per `src/lib/automation-executor.ts`):
  - `sendSMS` - Implemented (calls `sendMessage`)
  - `notifyOwner` - Implemented (calls `sendMessage` to owner)
  - `notifySitter` - Implemented (calls `sendMessage` to sitter)
- **Actions NOT Implemented** (per `DEVIATION_BACKLOG.md`):
  - `sendEmail` - Not implemented (optional per spec)
  - `createTask` - Not implemented
  - `addFee` - Not implemented
  - `applyDiscount` - Not implemented
  - `changeStatus` - Not implemented
  - `scheduleFollowUp` - Not implemented
- **Execution**: All automations run through worker queue (`src/lib/automation-queue.ts`)

### Authentication & Authorization
- **Authentication**:
  - NextAuth v5 configured
  - `src/lib/auth-helpers.ts` provides `getSessionSafe`, `requireSession`, `getCurrentUserSafe`
  - `src/middleware.ts` contains auth protection logic
  - **Enforcement**: NOT ACTIVE (`ENABLE_AUTH_PROTECTION=false`)
- **Authorization**:
  - Permission check helpers exist
  - **Enforcement**: NOT ACTIVE (`ENABLE_PERMISSION_CHECKS=false`)
- **Public Routes**: Allowlist maintained in `src/lib/public-routes.ts`
- **Protected Routes**: List exists in `src/lib/protected-routes.ts`

### Dashboards
- **Owner Dashboard**: EXISTS (`src/app/bookings/page.tsx`, `src/app/bookings/TodayBoard.tsx`)
- **Sitter Dashboard**: EXISTS (`src/app/sitter/page.tsx`)
- **Admin Dashboard**: EXISTS (settings pages, automation center)
- **Access Control**: NOT ENFORCED (flags false)

### Background Jobs
- **Queues Initialized** (per `src/lib/queue.ts`):
  - `reminderQueue` - EXISTS
  - `summaryQueue` - EXISTS
  - `reconciliationQueue` - EXISTS (Phase 7.2)
  - `automationQueue` - EXISTS
- **Workers Created**:
  - `reminderWorker` - EXISTS
  - `summaryWorker` - EXISTS
  - `reconciliationWorker` - EXISTS
  - Automation worker - EXISTS (`src/worker/automation-worker.ts`)
- **Scheduling**: 
  - `scheduleReminders()` - EXISTS
  - `scheduleDailySummary()` - EXISTS
  - `scheduleReconciliation()` - EXISTS
- **Initialization**: `initializeQueues()` function exists, must be called at app startup

---

## 4. DEAD CODE & STUBS

### Dead Code (Behind Always-False Flags)
- **Phase 1 Form Mapper Path**: Code exists in `src/app/api/form/route.ts` but not executed (`ENABLE_FORM_MAPPER_V1=false`)
- **Pricing Engine v1**: Code exists but not used (`USE_PRICING_ENGINE_V1=false`)
- **Auth Protection Middleware**: Logic exists but not enforced (`ENABLE_AUTH_PROTECTION=false`)
- **Permission Checks**: Logic exists but not enforced (`ENABLE_PERMISSION_CHECKS=false`)
- **Webhook Validation**: Logic exists but not enforced (`ENABLE_WEBHOOK_VALIDATION=false`)
- **Sitter Auth**: Logic exists but not enforced (`ENABLE_SITTER_AUTH=false`)

### Stubs (Not Implemented)
- **Automation Actions** (per Section 3 above):
  - `sendEmail` action - Not implemented
  - `createTask` action - Not implemented
  - `addFee` action - Not implemented
  - `applyDiscount` action - Not implemented
  - `changeStatus` action - Not implemented
  - `scheduleFollowUp` action - Not implemented
- **Session Management**:
  - Impersonation feature - Not implemented (per `DEVIATION_BACKLOG.md`)
- **Automation Templates**:
  - Arrival template - Not implemented (per `DEVIATION_BACKLOG.md`)
  - Departure template - Not implemented (per `DEVIATION_BACKLOG.md`)

### Functions That May Be Unused
- Cannot determine without runtime analysis. Code exists but flags prevent execution.

---

## 5. DEVIATIONS FROM MASTER SPEC

### Section 6.3.1: Template Library
- **Spec Requires**: "arrival, departure, review request, sitter assignment, key pickup reminder"
- **Implemented**: 7 templates (booking-confirmed, payment-failed, sitter-assignment, night-before-reminder, post-visit-thank-you, review-request, payment-reminder)
- **Missing**: arrival template, departure template
- **Note**: "night-before-reminder" exists but "key pickup reminder" not explicitly implemented
- **Classification**: NON-BLOCKING (per `DEVIATION_BACKLOG.md`)

### Section 6.3.2: Conditions Builder UI
- **Spec Requires**: "Conditions builder, booking status, service type, client tags, sitter tier, payment status, time windows"
- **Implemented**: Template structure supports conditions, API supports conditions
- **Missing**: Visual conditions builder UI
- **Classification**: NON-BLOCKING (per `DEVIATION_BACKLOG.md`)

### Section 6.3.3: Action Library
- **Spec Requires**: "complete set, send SMS, send email optional, create task, add fee, apply discount, change status, notify sitter, notify owner, schedule follow up"
- **Implemented**: send SMS, notify owner, notify sitter
- **Missing**: send email (optional), create task, add fee, apply discount, change status, schedule follow up
- **Classification**: NON-BLOCKING (per `DEVIATION_BACKLOG.md`, core actions complete)

### Section 12.2.5: Session Management
- **Spec Requires**: "Add session inventory, revoke, impersonation, audit reporting"
- **Implemented**: session inventory, revoke, audit reporting
- **Missing**: impersonation
- **Classification**: NON-BLOCKING (per `DEVIATION_BACKLOG.md`)

### Section 11.1: Gate A Baseline Truth
- **Spec Requires**: "Gate A Baseline Truth must remain updated when major modules change"
- **Status**: No evidence of current maintenance
- **Classification**: BLOCKING (per Master Spec Section 11.1)

### Section 11.2: Gate B Security Containment
- **Spec Requires**: "Gate B Security Containment must be enabled and verified before any expansion of surfaces"
- **Status**: Implemented but not enabled (`ENABLE_AUTH_PROTECTION=false`)
- **Classification**: BLOCKING (per Master Spec Section 11.2)

---

## 6. CURRENT SAFE NEXT ACTION

### SINGLE Correct Next Step:
**Complete Phase 1 Staging Verification**

**Required Actions**:
1. Verify production baseline: `ENABLE_FORM_MAPPER_V1=false` in production
2. Enable in staging only: `ENABLE_FORM_MAPPER_V1=true` in staging
3. Restart staging application
4. Submit 5 test bookings per `PHASE_1_STAGING_VERIFICATION_GUIDE.md`
5. Verify each booking against `PHASE_1_ACCEPTANCE_CHECKLIST.md`
6. If any booking fails: disable flag, restart, log failure, fix
7. Only after all 5 pass: mark Phase 1 as VERIFIED

### Explicitly Forbidden to Start Yet:
1. **Pricing Unification (Sprint A)** - Blocked by Phase 1 verification requirement
2. **Any new feature development** - Blocked by Phase 1 verification requirement
3. **Production rollout of Phase 1** - Blocked by staging verification requirement
4. **Gate B activation** - Blocked by Master Spec requirement (must verify Phase 1 first)

### What Must Be Verified Before Proceeding:
1. Phase 1 staging verification with 5 bookings must pass
2. All checklist items in `PHASE_1_ACCEPTANCE_CHECKLIST.md` must be verified
3. No field mapping errors
4. Pricing behavior unchanged (baseline maintained)
5. Mapping reports logged in EventLog

---

## 7. CONFIDENCE STATEMENT

**System is partially complete and blocked**

**Reasoning**:
- Phase 1 is implemented but NOT VERIFIED (explicit blocker)
- Gate A Baseline Truth not maintained (blocker per Master Spec 11.1)
- Gate B Security Containment not activated (blocker per Master Spec 11.2)
- Cannot proceed to Sprint A (Pricing Unification) until Phase 1 verification passes
- System is safe for current operations (baseline path working, flags default to false)
- System is NOT safe for new feature development (gates not satisfied)

---

**Last Updated**: 2024-12-30  
**Audit Method**: File system inspection, code analysis, documentation review  
**Evidence-Based**: All statements supported by file paths, code references, or documentation

