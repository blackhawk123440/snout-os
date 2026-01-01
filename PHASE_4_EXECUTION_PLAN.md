# Phase 4: Secure the System Without Breaking Booking Intake

**Master Spec Reference**: Lines 263-275
"Phase 4, secure the system without breaking booking intake"

**Date**: 2024-12-30

## Objective

Enable authentication protection on all admin/dashboard routes while keeping booking intake, webhooks, health, and tip routes publicly accessible. All changes must be feature-flag gated with instant rollback capability.

## Status: Step 1 Complete ✅

### Step 1: Confirm Allowlist is Correct ✅

**Master Spec Requirements (4.1)**:
- ✅ Booking intake endpoints and booking form page → `/api/form`, `/booking-form.html`
- ✅ Stripe webhook endpoints → `/api/webhooks/stripe`
- ✅ SMS provider webhook endpoints → `/api/webhooks/sms`
- ✅ Health endpoint → `/api/health`
- ✅ Tip payment pages if used → `/tip/*`, `/tip/success`, `/tip/payment`, etc.
- ✅ NextAuth routes (required for auth) → `/api/auth/*`

**Verification**: 
- File: `src/lib/public-routes.ts` contains all required public routes
- All routes match master spec requirements
- Allowlist is correct and ready

---

## Remaining Steps

### Step 2: Create Admin User

**Requirement**: Admin user must exist before enabling auth protection

**Options**:
1. Use existing script: `scripts/create-admin-user.ts`
2. Use SQL script: `CREATE_ADMIN_VIA_SQL.md`
3. Create via NextAuth credentials provider

**Action**: Verify if admin user exists, create if needed

---

### Step 3: Enable Auth Flag in Staging

**Requirement**: Enable `ENABLE_AUTH_PROTECTION=true` in staging environment

**Verification Checklist**:
- [ ] Booking form (`/api/form`) still accessible (public)
- [ ] Stripe webhooks (`/api/webhooks/stripe`) still accessible (public)
- [ ] SMS webhooks (`/api/webhooks/sms`) still accessible (public)
- [ ] Health endpoint (`/api/health`) still accessible (public)
- [ ] Tip pages (`/tip/*`) still accessible (public)
- [ ] Login page (`/login`) accessible
- [ ] Dashboard (`/`) redirects to `/login` when not authenticated
- [ ] Settings (`/settings`) redirects to `/login` when not authenticated
- [ ] Bookings (`/bookings`) redirects to `/login` when not authenticated
- [ ] All protected routes redirect to `/login` with `callbackUrl` preserved
- [ ] After login, redirect to `callbackUrl` works correctly
- [ ] Public routes remain accessible without authentication

**Rollback**: Set `ENABLE_AUTH_PROTECTION=false` and restart

---

### Step 4: Enable in Production During Low Traffic

**Requirement**: Enable `ENABLE_AUTH_PROTECTION=true` in production during low traffic window

**Process**:
1. Choose low traffic window (early morning recommended)
2. Set `ENABLE_AUTH_PROTECTION=true` in production environment
3. Restart production application
4. Monitor logs for errors
5. Verify booking form still works (test with real booking)
6. Verify webhooks still work (monitor Stripe webhook logs)
7. Monitor for 24-48 hours for issues

**Rollback**: Set `ENABLE_AUTH_PROTECTION=false` and restart

---

### Step 5: Enable Permission Checks

**Requirement**: Enable `ENABLE_PERMISSION_CHECKS=true` after auth protection is stable

**Note**: This requires permission checks to be implemented in API routes. Verify implementation exists before enabling.

**Process**:
1. Verify permission checks are implemented in all mutation endpoints
2. Enable `ENABLE_PERMISSION_CHECKS=true` in staging first
3. Test all admin operations with admin user
4. Verify permission denied errors are logged
5. Enable in production after staging verification

**Rollback**: Set `ENABLE_PERMISSION_CHECKS=false`

---

### Step 6: Enable Webhook Validation

**Requirement**: Enable `ENABLE_WEBHOOK_VALIDATION=true` for production security

**Note**: This requires webhook signature validation to be implemented. Verify implementation exists before enabling.

**Process**:
1. Verify webhook signature validation is implemented for:
   - Stripe webhooks (`/api/webhooks/stripe`)
   - SMS provider webhooks (`/api/webhooks/sms`)
2. Enable `ENABLE_WEBHOOK_VALIDATION=true` in staging first
3. Test webhook receipt with valid signatures
4. Test webhook rejection with invalid signatures
5. Enable in production after staging verification
6. Configure webhook signing secrets in production environment

**Rollback**: Set `ENABLE_WEBHOOK_VALIDATION=false`

---

## Safety Guarantees

1. **Feature Flags Default to False**: All security flags default to `false`, ensuring zero risk on deployment
2. **One Flag Rollback**: Each step can be rolled back with a single flag flip
3. **Public Routes Preserved**: Allowlist ensures booking intake, webhooks, health, and tips remain public
4. **Staging Verification**: All changes tested in staging before production
5. **No Breaking Changes**: When flags are `false`, behavior is identical to current state

---

## Current State

- ✅ **Allowlist**: Confirmed correct per master spec
- ⏳ **Admin User**: Needs verification/creation
- ⏳ **Auth Protection**: Flag defaults to `false` (safe)
- ⏳ **Permission Checks**: Flag defaults to `false` (safe)
- ⏳ **Webhook Validation**: Flag defaults to `false` (safe)

---

## Next Action

**Step 2**: Verify/create admin user before proceeding with auth enablement

