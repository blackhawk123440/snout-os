# Quick Start: Phase 2.2 Verification

## Step 1: Create Admin User (REQUIRED FIRST)

```bash
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourPassword123! "Admin User"
```

✅ **Success looks like:**
```
✅ Admin user created/updated:
   Email: admin@snoutservices.com
   Name: Admin User
   ID: <uuid>
```

---

## Step 2: Test Login (Protection OFF)

```bash
# Start server
npm run dev

# In browser: http://localhost:3000/login
```

**Test:**
- [ ] Login page loads
- [ ] Sign in with admin credentials works
- [ ] All routes still accessible (no redirects)

---

## Step 3: Enable Protection (Testing)

```bash
# Edit .env: ENABLE_AUTH_PROTECTION=true
# Restart server
```

**CRITICAL Tests:**
1. Navigate to `/settings` → Should redirect to `/login?callbackUrl=/settings`
2. Sign in → Should redirect back to `/settings`
3. **VERIFY:** `/api/form` still accessible (booking form) ✅
4. **VERIFY:** `/api/webhooks/stripe` still accessible ✅
5. **VERIFY:** `/api/webhooks/sms` still accessible ✅

---

## Step 4: Rollback Test

```bash
# Edit .env: ENABLE_AUTH_PROTECTION=false
# Restart server
```

**Verify:** All routes accessible again ✅

---

## Full Checklist

See `GATE_B_PHASE_2.2_VERIFICATION.md` for complete 16-test checklist.

See `GATE_B_ROLLOUT_NEXT_STEPS.md` for production enablement steps.

---

## If Anything Fails

**INSTANT ROLLBACK:**
```bash
# Set ENABLE_AUTH_PROTECTION=false in .env
# Restart server
```

All routes immediately accessible again. Zero risk.

