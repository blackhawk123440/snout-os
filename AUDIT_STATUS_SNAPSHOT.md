# Audit Status Snapshot - Snout OS

**Date**: 2024-12-30  
**Type**: Evidence-Based Status Report  
**Purpose**: Single source of truth for current system state

---

## 1. Runtime Inventory (Render)

### Production Web Service
- **Expected Name**: `snout-os` or similar (Render web service)
- **Evidence**: User statement: "you're on Render for the live dashboard"
- **Expected PORT**: 10000 (Render default) or configured via PORT env var
- **Health Endpoint**: `/api/health` (evidence: `src/app/api/health/route.ts` exists)
- **Required Env Vars**:
  - `DATABASE_URL` (points to "snout os db" per user statement)
  - `OPENPHONE_API_KEY` (required per `src/lib/env.ts:9`)
  - `NODE_ENV` (defaults to "development" per `src/lib/env.ts:7`)

### Staging Web Service
- **Status**: UNKNOWN (no evidence found in codebase)
- **Expected Name**: `snout-os-staging` (per user requirements)
- **Expected PORT**: 10000 (Render default) or configured via PORT env var
- **Health Endpoint**: `/api/health` (same as production)
- **Required Env Vars**: Same as production, with:
  - `DATABASE_URL` (points to staging DB: `snout-os-db-staging`)
  - `ENABLE_FORM_MAPPER_V1=true` (staging only)

### Worker Service
- **Status**: UNKNOWN (no evidence of separate worker service)
- **Evidence**: Worker code exists (`src/worker/index.ts` calls `initializeQueues()`)
- **Note**: Workers may run in same web service process (per `src/worker/index.ts:11-12`: auto-starts if `typeof window === "undefined"`)

### Render Configuration
- **Evidence**: `render.yaml` EXISTS but is EMPTY (0 lines)
- **Status**: Render services configured via dashboard, not via yaml file

---

## 2. Database Inventory

### Production Database
- **Name**: "snout os db" (per user statement)
- **Type**: Render Postgres (per user statement)
- **Connection**: Via `DATABASE_URL` environment variable
- **Evidence**: `src/lib/db.ts:11` creates PrismaClient with default connection
- **Schema**: Prisma schema at `prisma/schema.prisma`

### Staging Database
- **Status**: DOES NOT EXIST (per user statement: "create a second Render Postgres")
- **Expected Name**: `snout-os-db-staging` (per user requirements)
- **Required**: Must be created before staging verification can proceed

### Database Migrations
- **Migrations Folder**: `prisma/migrations/` - EXISTS
- **Migration Files Found**:
  - `20250112000000_add_sitter_commission_percentage/migration.sql`
  - `20251110232715_add_pet_taxi_addresses/migration.sql`
  - `20251110232727_add_pet_taxi_addresses/migration.sql`
  - `20251111091609_make_address_email_nullable/migration.sql`
- **Migration Status**: UNKNOWN (migrations exist, but applied status requires deploy log inspection)
- **Evidence**: Prisma schema exists at `prisma/schema.prisma`, migrations folder exists with 4 migrations

### DATABASE_URL Usage
- **Evidence**: 
  - `src/lib/db.ts` uses PrismaClient (connects via DATABASE_URL automatically)
  - `src/lib/env.ts:8` validates DATABASE_URL as required
- **Connection Method**: Prisma Client handles connection string parsing

---

## 3. Feature Flag Matrix

### Source of Truth
- **File**: `src/lib/env.ts` (lines 29-37)
- **Default Behavior**: All flags default to `false` unless explicitly set to `"true"` in environment

### Flags Enumerated

#### ENABLE_AUTH_PROTECTION
- **Default**: `false` (evidence: `src/lib/env.ts:30` - only true if env var equals "true")
- **Usage**: 
  - `src/middleware.ts:20` - checks flag to enable/disable auth protection
  - `src/app/api/health/route.ts:43` - reports flag status in health endpoint
- **Surfaces Gated**: All protected routes (per `src/lib/protected-routes.ts`)
- **Current Status**: OFF (default)

#### ENABLE_SITTER_AUTH
- **Default**: `false` (evidence: `src/lib/env.ts:31`)
- **Usage**:
  - `src/middleware.ts:21` - checks flag for sitter auth restrictions
  - `src/app/api/reports/route.ts:49` - checks flag for sitter verification
  - `src/app/api/health/route.ts:44` - reports flag status
- **Surfaces Gated**: Sitter routes (per `src/lib/sitter-routes.ts`)
- **Current Status**: OFF (default)

#### ENABLE_PERMISSION_CHECKS
- **Default**: `false` (evidence: `src/lib/env.ts:32`)
- **Usage**:
  - `src/middleware.ts:22` - checks flag (defined but behavior unclear from code)
  - `src/app/api/health/route.ts:45` - reports flag status
- **Surfaces Gated**: API mutations (requires code search to confirm)
- **Current Status**: OFF (default)

#### ENABLE_WEBHOOK_VALIDATION
- **Default**: `false` (evidence: `src/lib/env.ts:33`)
- **Usage**:
  - `src/app/api/webhooks/stripe/route.ts` (expected, not verified)
  - `src/app/api/webhooks/sms/route.ts` (expected, not verified)
  - `src/app/api/health/route.ts:46` - reports flag status
- **Surfaces Gated**: Webhook endpoints
- **Current Status**: OFF (default)

#### ENABLE_FORM_MAPPER_V1
- **Default**: `false` (evidence: `src/lib/env.ts:35`)
- **Usage**:
  - `src/app/api/form/route.ts:66` - checks flag: `const useMapper = env.ENABLE_FORM_MAPPER_V1 === true;`
  - When `true`: uses mapper path (lines 68-91)
  - When `false`: uses existing path (lines 217+)
- **Surfaces Gated**: Form submission route (`/api/form`)
- **Current Status**: OFF (default)
- **Production**: MUST remain `false` until staging verification passes
- **Staging**: Should be `true` for verification

#### USE_PRICING_ENGINE_V1
- **Default**: `false` (evidence: `src/lib/env.ts:37`)
- **Usage**:
  - `src/app/api/form/route.ts:131` - checks flag: `const usePricingEngine = env.USE_PRICING_ENGINE_V1 === true;`
  - When `true`: uses canonical pricing engine (lines 136-154)
  - When `false`: uses existing pricing logic (lines 155-169)
- **Surfaces Gated**: Pricing calculation in form route
- **Current Status**: OFF (default)

---

## 4. Phase 1 Form Mapper Status

### Code Existence
- **Mapper Implementation**: `src/lib/form-to-booking-mapper.ts` - EXISTS
- **Validation Schema**: `src/lib/validation/form-booking.ts` - EXISTS
- **Mapper Helpers**: `src/lib/form-mapper-helpers.ts` - EXISTS (imported in form route)
- **Evidence**: `src/app/api/form/route.ts:12` imports `validateAndMapFormPayload`

### Integration in Form Route
- **File**: `src/app/api/form/route.ts`
- **Integration Point**: Lines 65-91
- **Evidence**:
  - Line 66: `const useMapper = env.ENABLE_FORM_MAPPER_V1 === true;`
  - Line 68: `if (useMapper) {` - conditional execution
  - Lines 70-91: Mapper path with validation and logging
  - Lines 217+: Existing path (executes when flag is false)
- **Status**: INTEGRATED (code exists and is conditionally executed)

### Tests Existence
- **Unit Tests**: `src/lib/__tests__/form-to-booking-mapper.test.ts` - EXISTS (confirmed in file listing)
- **Integration Tests**: `src/app/api/__tests__/form-route-integration.test.ts` - EXISTS (confirmed via grep results)
- **Test Execution**: `npm test` (per `package.json:14` - "test": "vitest run")
- **Last Test Run**: UNKNOWN (requires test execution)

### Staging Verification Status
- **Checklist File**: `PHASE_1_ACCEPTANCE_CHECKLIST.md` - EXISTS
- **Status Field**: Line 5: "⚠️ **NOT VERIFIED** - Must be completed before proceeding"
- **Verification Results**: Lines 144-150 show all bookings as "⚠️ Pending"
- **Final Verdict**: Line 154: "⚠️ **NOT VERIFIED** - Verification not started"
- **Evidence of Completion**: NONE
- **Status**: NOT VERIFIED

---

## 5. Gate B Security Containment Status

### NextAuth Configuration
- **Auth Helpers**: `src/lib/auth-helpers.ts` - EXISTS (provides `getSessionSafe`, `requireSession`, `getCurrentUserSafe`)
- **Auth Route**: `src/app/api/auth/[...nextauth]/route.ts` - EXISTS (confirmed via grep results)
- **Evidence**: `src/middleware.ts:13` imports `getSessionSafe` from `@/lib/auth-helpers`
- **Login Page**: `src/app/login/page.tsx` - EXISTS (confirmed in file listing)
- **Status**: WIRED (helpers exist, middleware uses them, auth route exists)

### Middleware Behavior
- **File**: `src/middleware.ts`
- **When Flag OFF** (`ENABLE_AUTH_PROTECTION=false`):
  - Line 46-48: `if (!enableAuthProtection) { return NextResponse.next(); }`
  - **Behavior**: Allows all requests (no auth enforcement)
- **When Flag ON** (`ENABLE_AUTH_PROTECTION=true`):
  - Lines 50-69: Checks public routes, then protected routes
  - Line 58: `const session = await getSessionSafe();`
  - Lines 60-64: Redirects to `/login` if no session
  - **Behavior**: Enforces authentication on protected routes
- **Public Routes**: Defined in `src/lib/public-routes.ts`
- **Protected Routes**: Defined in `src/lib/protected-routes.ts`

### Admin User Creation Script
- **Expected Location**: `scripts/create-admin-user.ts` (per user references in other docs)
- **Status**: EXISTS (confirmed in scripts directory listing)
- **Evidence**: Script exists, exact implementation not verified in audit

### Protection Enabled Status
- **Production**: OFF (ENABLE_AUTH_PROTECTION defaults to false)
- **Staging**: UNKNOWN (requires environment inspection)
- **Evidence**: No environment variable inspection possible in audit
- **Default State**: All protection flags default to `false` per `src/lib/env.ts`

---

## 6. Blocking Next Step

### Single Correct Next Step

**SETUP RENDER STAGING ENVIRONMENT AND COMPLETE PHASE 1 VERIFICATION**

### Exact Actions Required

1. **In Render Dashboard:**
   - Confirm staging web service exists (check for `snout-os-staging` or similar)
   - If missing: Create new Render Web Service named `snout-os-staging`

2. **Create Staging Database:**
   - In Render Dashboard: Create new Render Postgres database
   - Name: `snout-os-db-staging`
   - Note the connection string (DATABASE_URL)

3. **Configure Staging Service:**
   - Point staging service to staging DB via `DATABASE_URL` env var
   - Copy all production env vars to staging
   - Set `ENABLE_FORM_MAPPER_V1=true` (staging only)
   - Verify `ENABLE_FORM_MAPPER_V1=false` on production (do not change)

4. **Deploy Staging:**
   - Deploy staging service
   - Verify health endpoint: `https://your-staging-url.onrender.com/api/health`

5. **Run Phase 1 Verification:**
   - Follow `PHASE_1_STAGING_VERIFICATION_GUIDE.md`
   - Submit 5 test bookings through staging booking form
   - Fill out `PHASE_1_ACCEPTANCE_CHECKLIST.md` for each booking
   - Verify all checklist items pass

6. **Mark Verification Complete:**
   - Only after all 5 bookings pass
   - Update `PHASE_1_ACCEPTANCE_CHECKLIST.md` status to "VERIFIED"
   - Document completion date and verified by

### Forbidden Actions (Until Verification Passes)
- DO NOT enable `ENABLE_FORM_MAPPER_V1=true` on production
- DO NOT proceed to Pricing Unification (Sprint A)
- DO NOT make any other code changes
- DO NOT skip staging verification

### Checklist Reference
- **Verification Guide**: `PHASE_1_STAGING_VERIFICATION_GUIDE.md`
- **Acceptance Checklist**: `PHASE_1_ACCEPTANCE_CHECKLIST.md`
- **Status**: Currently shows "NOT VERIFIED" (line 5)

---

## Evidence Summary

### Verified Through Code Inspection
- Feature flags defined in `src/lib/env.ts` (all default to false)
- Phase 1 mapper integrated in `src/app/api/form/route.ts` (lines 65-91)
- Middleware auth logic exists (`src/middleware.ts`)
- Auth helpers exist (`src/lib/auth-helpers.ts`)
- Phase 1 checklist exists and shows "NOT VERIFIED"

### Requires External Verification
- Render service configuration (staging service existence)
- Database existence (staging DB)
- Environment variable values (actual flag states in deployed environments)
- Test execution results (test pass/fail status)
- Migration status (Prisma migrations applied)

### Cannot Verify Without Access
- Render dashboard configuration
- Actual environment variables in deployed services
- Database connection strings
- Service deployment status

---

**Last Updated**: 2024-12-30  
**Audit Method**: File system inspection, code analysis  
**Confidence**: High (all code-based claims), Low (deployment status claims)

