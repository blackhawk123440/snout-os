# GATE B: SECURITY CONTAINMENT PLAN
**Status:** PROPOSED  
**Goal:** Stop public access risk immediately without breaking operations

---

## OBJECTIVE

Add authentication and authorization walls to all admin/dashboard routes while:
1. Keeping booking form submission public (required for business)
2. Not breaking any existing functionality
3. Providing rollback paths for each change
4. Using feature flags for risky behavior changes

---

## ARCHITECTURE APPROACH

### Phase 1: Auth Infrastructure (Zero Risk)
- Add auth library (NextAuth.js recommended for Next.js)
- Create User and Session models
- Add auth middleware (non-blocking initially)
- No route protection yet - infrastructure only

### Phase 2: Public Allowlist (Low Risk)
- Define explicit public routes
- Add middleware that allows public routes
- All other routes remain accessible (no breaking change yet)

### Phase 3: Protected Routes (Controlled Risk)
- Enable auth requirement for admin routes
- Use feature flag to enable/disable protection
- Add fallback/error handling

### Phase 4: Role-Based Access (Controlled Risk)
- Add role checks to mutations
- Enforce sitter-only access to sitter routes
- Use feature flags per route group

---

## IMPLEMENTATION SEQUENCE

### Step 1: Add Authentication Library
**Risk:** ZERO (no behavior change)
**Rollback:** Remove package, no code changes to revert

**Actions:**
1. Install NextAuth.js: `npm install next-auth@beta` (Next.js 15 compatible)
2. Create basic NextAuth configuration
3. Add environment variables for auth secrets
4. Create placeholder User model (or extend Sitter model)

**Files to Create:**
- `src/lib/auth.ts` - Auth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API route
- Update `prisma/schema.prisma` - Add User/Session models if needed

**Feature Flag:** None needed (infrastructure only)

**Verification:**
- Auth routes accessible at `/api/auth/*`
- No existing routes affected
- Booking form still works

**Rollback:**
- Remove `next-auth` package
- Delete auth files
- No other changes needed

---

### Step 2: Create Middleware Infrastructure (Non-Blocking)
**Risk:** ZERO (middleware exists but allows all)
**Rollback:** Revert middleware.ts to current state

**Actions:**
1. Update `src/middleware.ts` to import auth check
2. Implement route matcher for public vs protected
3. Initially return `NextResponse.next()` for all routes (no blocking)

**Files to Modify:**
- `src/middleware.ts`

**Public Routes Allowlist:**
```typescript
const PUBLIC_ROUTES = [
  '/api/form',           // Booking form submission
  '/api/form/route.ts',  // Same
  '/api/webhooks/stripe', // Stripe webhook (needs signature validation)
  '/api/webhooks/sms',    // SMS webhook
  '/api/health',          // Health check
  '/public/booking-form.html', // Static booking form
  '/tip/',                // Tip payment pages (if should remain public)
];
```

**Feature Flag:** None (non-blocking)

**Verification:**
- All routes still accessible
- Middleware runs but doesn't block
- Logging shows which routes would be protected

**Rollback:**
- Revert `src/middleware.ts` to current empty implementation

---

### Step 3: Add Session Context to API Routes (Non-Blocking)
**Risk:** LOW (optional session, doesn't block)
**Rollback:** Remove session checks, routes work without auth

**Actions:**
1. Create helper: `src/lib/auth-helpers.ts` with `getSession()` function
2. Add optional session checks to one test route first
3. Route works with or without session (backwards compatible)

**Files to Create:**
- `src/lib/auth-helpers.ts`

**Example Implementation:**
```typescript
// auth-helpers.ts
export async function getSession(request: NextRequest) {
  // Returns session or null
  // Does not throw - backwards compatible
}

export async function requireAuth(request: NextRequest) {
  // Returns session or throws (for protected routes)
}
```

**Feature Flag:** None (optional usage)

**Verification:**
- Routes work without session
- Routes work with session
- No breaking changes

**Rollback:**
- Remove auth-helpers.ts
- Remove session checks from routes

---

### Step 4: Protect Admin Routes with Feature Flag (Controlled)
**Risk:** MEDIUM (blocks access, but feature flag allows rollback)
**Rollback:** Disable feature flag, routes become accessible again

**Actions:**
1. Add feature flag: `ENABLE_AUTH_PROTECTION` (env variable)
2. Update middleware to check flag
3. Protect admin routes only when flag enabled
4. Redirect to login page if not authenticated

**Routes to Protect (First Batch):**
```
/api/automations/*
/api/settings/*
/api/business-settings
/api/pricing-rules/*
/api/service-configs/*
/api/stripe/*
/api/payments/create-payment-link
/api/payments/create-tip-link
/api/templates/*
/api/message-templates/*
/api/calendar/*
/api/roles
```

**Files to Modify:**
- `src/middleware.ts` - Add feature flag check and route protection

**Feature Flag:**
```typescript
const ENABLE_AUTH_PROTECTION = process.env.ENABLE_AUTH_PROTECTION === 'true';
```

**Verification:**
- With flag OFF: All routes accessible (current behavior)
- With flag ON: Admin routes require auth, public routes still work
- Booking form submission still works regardless of flag

**Rollback:**
- Set `ENABLE_AUTH_PROTECTION=false`
- Routes become accessible immediately
- No code changes needed

---

### Step 5: Protect Dashboard Pages (Controlled)
**Risk:** MEDIUM (blocks access, but feature flag allows rollback)
**Rollback:** Disable feature flag, pages become accessible again

**Actions:**
1. Use same feature flag approach
2. Add auth check to page components or layout
3. Redirect to login if not authenticated

**Pages to Protect:**
```
/app/bookings/*
/app/clients/*
/app/payments/*
/app/messages/*
/app/calendar/*
/app/settings/*
/app/automation-center/*
/app/templates/*
/app/integrations/*
```

**Public Pages (Allowlist):**
```
/app/page.tsx (homepage - may redirect to login)
/public/booking-form.html (static file)
```

**Files to Modify:**
- `src/app/layout.tsx` or create `src/app/(protected)/layout.tsx`
- Or use middleware to redirect

**Feature Flag:** Same `ENABLE_AUTH_PROTECTION`

**Verification:**
- With flag OFF: All pages accessible
- With flag ON: Dashboard pages require auth
- Booking form still accessible

**Rollback:**
- Set `ENABLE_AUTH_PROTECTION=false`
- Pages become accessible

---

### Step 6: Protect Sitter Routes with Role Check (Controlled)
**Risk:** MEDIUM (requires sitter authentication)
**Rollback:** Feature flag or allow access without role check temporarily

**Actions:**
1. Add role check helper
2. Protect sitter routes: `/api/sitters/[id]/dashboard`, `/api/sitter/*`
3. Verify sitter ID matches session user
4. Protect sitter pages: `/app/sitter/*`, `/app/sitter-dashboard/*`

**Files to Modify:**
- `src/lib/auth-helpers.ts` - Add `requireSitterRole()`
- `src/middleware.ts` - Add sitter route protection
- Sitter page components

**Feature Flag:** `ENABLE_SITTER_AUTH` (separate flag)

**Verification:**
- Sitters can access their own dashboard
- Sitters cannot access other sitter data
- Sitters cannot access admin routes

**Rollback:**
- Set `ENABLE_SITTER_AUTH=false`
- Or allow access without role check temporarily

---

### Step 7: Add Permission Checks to Mutations (Controlled)
**Risk:** MEDIUM (blocks unauthorized mutations)
**Rollback:** Remove permission checks, allow all mutations

**Actions:**
1. Add permission check helpers
2. Add checks to PATCH/DELETE operations
3. Start with read-only enforcement, then mutations

**Routes to Protect:**
```
PATCH /api/bookings/[id]
PATCH /api/sitters/[id]
PATCH /api/clients/[id]
DELETE /api/automations/[id]
POST /api/automations
PATCH /api/settings/*
```

**Files to Modify:**
- Each API route file
- Add `requirePermission()` calls before mutations

**Feature Flag:** `ENABLE_PERMISSION_CHECKS` (separate flag)

**Verification:**
- Read operations work (backwards compatible)
- Mutations require appropriate permissions
- Test with different user roles

**Rollback:**
- Set `ENABLE_PERMISSION_CHECKS=false`
- Or comment out permission checks

---

### Step 8: Protect Webhook Routes with Signature Validation (Low Risk)
**Risk:** LOW (webhooks should validate anyway)
**Rollback:** Remove validation, allow all webhook requests

**Actions:**
1. Add Stripe webhook signature validation
2. Add SMS webhook validation (if provider supports)
3. Webhooks remain publicly accessible but validated

**Files to Modify:**
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/sms/route.ts`

**Feature Flag:** `ENABLE_WEBHOOK_VALIDATION`

**Verification:**
- Valid webhooks work
- Invalid webhooks rejected
- No impact on public booking form

**Rollback:**
- Set `ENABLE_WEBHOOK_VALIDATION=false`
- Or remove validation code

---

## ROLLBACK STRATEGY PER STEP

### Global Rollback (Nuclear Option)
If everything breaks:
1. Set all feature flags to `false`
2. System returns to current state (all routes public)
3. No data changes, no breaking changes
4. Can investigate and fix, then re-enable flags

### Per-Step Rollback
Each step has independent rollback:
- Step 1: Remove auth library (no behavior change)
- Step 2: Revert middleware (no behavior change)
- Step 3: Remove session helpers (no behavior change)
- Step 4: Set `ENABLE_AUTH_PROTECTION=false`
- Step 5: Set `ENABLE_AUTH_PROTECTION=false`
- Step 6: Set `ENABLE_SITTER_AUTH=false`
- Step 7: Set `ENABLE_PERMISSION_CHECKS=false`
- Step 8: Set `ENABLE_WEBHOOK_VALIDATION=false`

---

## TESTING PLAN

### Before Each Step
1. Document current behavior
2. Test booking form submission
3. Test admin dashboard access
4. Test API route access

### After Each Step
1. Verify booking form still works
2. Verify protected routes behave correctly
3. Test with feature flags ON and OFF
4. Verify no regressions

### Integration Tests
1. Create test user account
2. Test login flow
3. Test protected route access
4. Test public route access
5. Test role-based access
6. Test permission checks

---

## ENVIRONMENT VARIABLES NEEDED

```bash
# Auth Configuration
NEXTAUTH_URL=http://localhost:3000  # or production URL
NEXTAUTH_SECRET=<generate-random-secret>
NEXTAUTH_URL_INTERNAL=http://localhost:3000  # for server-side

# Feature Flags
ENABLE_AUTH_PROTECTION=false  # Start disabled
ENABLE_SITTER_AUTH=false      # Start disabled
ENABLE_PERMISSION_CHECKS=false # Start disabled
ENABLE_WEBHOOK_VALIDATION=true # Can enable immediately

# Database (existing)
DATABASE_URL=<existing-connection-string>
```

---

## MIGRATION PATH FOR EXISTING DATA

### User Model Strategy
**Option A: Extend Sitter Model**
- Add `email`, `passwordHash`, `role` to Sitter model
- Existing sitters become users
- Simple migration

**Option B: Create User Model**
- Create new User model
- Link Sitter to User via `sitter.userId`
- More flexible but requires migration

**Recommendation:** Option A for simplicity, Option B for future flexibility

### Initial Admin User Creation
1. Create seed script to create first admin user
2. Or provide CLI command to create admin
3. Or manual database insert for first user

---

## MINIMAL SAFE SEQUENCE (RECOMMENDED)

### Phase 1: Infrastructure (Zero Risk)
1. ✅ Step 1: Add auth library
2. ✅ Step 2: Create middleware infrastructure (non-blocking)
3. ✅ Step 3: Add session context helpers

### Phase 2: Controlled Protection (Feature Flags)
4. ✅ Step 4: Protect admin API routes (flag: `ENABLE_AUTH_PROTECTION`)
5. ✅ Step 5: Protect dashboard pages (same flag)
6. ✅ Step 6: Protect sitter routes (flag: `ENABLE_SITTER_AUTH`)

### Phase 3: Fine-Grained Control
7. ✅ Step 7: Add permission checks (flag: `ENABLE_PERMISSION_CHECKS`)
8. ✅ Step 8: Webhook validation (flag: `ENABLE_WEBHOOK_VALIDATION`)

### Deployment Strategy
1. Deploy Phase 1 with all flags OFF (zero risk)
2. Test in production with flags OFF
3. Enable flags one at a time in production
4. Monitor for issues
5. Rollback by disabling flag if needed

---

## GATE B PASS CRITERIA

- ✅ No dashboard or admin endpoint accessible without login
- ✅ Booking form submission remains public and functional
- ✅ Role-based enforcement proven by tests
- ✅ Feature flags allow instant rollback
- ✅ All existing functionality preserved
- ✅ No data loss or corruption

**READY TO PROCEED WITH PHASE 1**

