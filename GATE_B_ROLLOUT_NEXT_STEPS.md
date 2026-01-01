# Gate B Rollout: Next Steps After Phase 2.2

## Current Status

✅ **Phase 2.1 Complete:** Route protection infrastructure  
✅ **Phase 2.2 Complete:** Real authentication with NextAuth v5  

**Next Objective:** Verify and enable protection safely

---

## Step-by-Step Command List

### 1. Create Admin User (MANDATORY FIRST STEP)

```bash
# Navigate to repo root
cd "/Users/leahhudson/Desktop/final form/snout-os"

# Create admin user (replace with your email/password)
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourSecurePassword123! "Admin User"

# Verify user was created
npx prisma studio
# Navigate to User table, verify user exists with hashed password
```

**Expected:** Script outputs success message with user details

---

### 2. Verify Environment Variables

```bash
# Check .env file has required variables
cat .env | grep -E "NEXTAUTH|ENABLE_AUTH"

# Should show:
# NEXTAUTH_SECRET=<your-secret>
# NEXTAUTH_URL=http://localhost:3000
# ENABLE_AUTH_PROTECTION=false
```

**If missing NEXTAUTH_SECRET:**
```bash
# Generate secret
openssl rand -base64 32

# Add to .env file
echo "NEXTAUTH_SECRET=<paste-generated-secret>" >> .env
```

---

### 3. Test Login (Protection OFF)

```bash
# Start dev server
npm run dev

# In browser, navigate to:
# http://localhost:3000/login

# Test login with created admin credentials
```

**Verification Checklist:**
- [ ] Login page loads
- [ ] Can sign in with valid credentials
- [ ] Invalid credentials show error
- [ ] All dashboard pages accessible (no redirects)

---

### 4. Enable Protection (Testing)

```bash
# Edit .env file
# Change: ENABLE_AUTH_PROTECTION=true

# Restart dev server (Ctrl+C, then)
npm run dev

# Test in browser (use incognito or clear cookies)
```

**Critical Tests:**
1. Navigate to `/settings` → Should redirect to `/login?callbackUrl=/settings`
2. Sign in → Should redirect back to `/settings`
3. Verify `/api/form` still accessible (CRITICAL - booking form)
4. Verify `/api/webhooks/stripe` still accessible (CRITICAL)
5. Verify `/api/webhooks/sms` still accessible (CRITICAL)
6. Verify `/api/health` still accessible

---

### 5. Rollback Test

```bash
# Edit .env file
# Change: ENABLE_AUTH_PROTECTION=false

# Restart dev server
npm run dev

# Verify all routes accessible again
```

---

## Pass/Fail Verification Table

### Phase 2.2 Verification

| # | Test | Command/Action | Expected Result | Status |
|---|------|----------------|-----------------|--------|
| 1 | Admin user created | `npx tsx scripts/create-admin-user.ts ...` | Success message, user in DB | [ ] PASS / [ ] FAIL |
| 2 | Login page loads | Navigate to `/login` | Form displays | [ ] PASS / [ ] FAIL |
| 3 | Valid login works | Sign in with credentials | Redirects, session created | [ ] PASS / [ ] FAIL |
| 4 | Invalid login error | Wrong password | Error message shown | [ ] PASS / [ ] FAIL |
| 5 | Routes accessible (flag off) | Navigate to `/settings`, `/bookings` | Load without redirect | [ ] PASS / [ ] FAIL |
| 6 | Protected routes redirect (flag on) | Navigate to `/settings` | Redirects to `/login?callbackUrl=/settings` | [ ] PASS / [ ] FAIL |
| 7 | CallbackUrl redirect | Sign in from redirect | Returns to original page | [ ] PASS / [ ] FAIL |
| 8 | Session persists | Refresh page after login | Still logged in | [ ] PASS / [ ] FAIL |
| 9 | Booking form accessible | Navigate to `/api/form` | Accessible (CRITICAL) | [ ] PASS / [ ] FAIL |
| 10 | Stripe webhook accessible | Navigate to `/api/webhooks/stripe` | Accessible (CRITICAL) | [ ] PASS / [ ] FAIL |
| 11 | SMS webhook accessible | Navigate to `/api/webhooks/sms` | Accessible (CRITICAL) | [ ] PASS / [ ] FAIL |
| 12 | Health check accessible | Navigate to `/api/health` | Returns JSON | [ ] PASS / [ ] FAIL |
| 13 | Tip routes accessible | Navigate to `/tip/success` | Loads | [ ] PASS / [ ] FAIL |
| 14 | NextAuth routes accessible | Navigate to `/api/auth/providers` | Returns JSON | [ ] PASS / [ ] FAIL |
| 15 | Logout works | Sign out, try protected route | Redirects to login | [ ] PASS / [ ] FAIL |
| 16 | Rollback works | Set flag false, restart | All routes accessible | [ ] PASS / [ ] FAIL |

**Critical Tests:** 9, 10, 11 (must all pass before production)

---

## Rollback Steps

### Instant Rollback Command Sequence

```bash
# 1. Edit .env file
# Set: ENABLE_AUTH_PROTECTION=false

# 2. Restart server
# Ctrl+C to stop
npm run dev

# 3. Verify (in browser)
# All routes should be accessible immediately
# No login required
# Booking form works
# Webhooks work
```

**Rollback Time:** < 30 seconds (server restart)

**Verification:**
- [ ] Protected routes accessible without login
- [ ] Booking form submission works
- [ ] Webhooks receive requests
- [ ] No authentication errors in logs

---

## Staging Enablement (Before Production)

If you have a staging environment:

```bash
# 1. Create admin user in staging DB
npx tsx scripts/create-admin-user.ts admin@example.com Password123!

# 2. Set environment variables in staging
ENABLE_AUTH_PROTECTION=true
NEXTAUTH_SECRET=<staging-secret>
NEXTAUTH_URL=https://staging.yourdomain.com

# 3. Restart staging server

# 4. Run full verification checklist in staging

# 5. Monitor for 24-48 hours

# 6. If stable, proceed to production
```

---

## Production Enablement (Low-Traffic Window)

### Pre-Enablement Checklist

- [ ] All development tests passed
- [ ] Staging tests passed (if available)
- [ ] Admin user(s) created in production
- [ ] `NEXTAUTH_SECRET` set in production
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] Database migrations applied
- [ ] Rollback procedure tested
- [ ] Low-traffic window scheduled

### Enablement Steps

```bash
# 1. Enable protection
# Edit production .env
ENABLE_AUTH_PROTECTION=true

# 2. Restart production server
# (Follow your deployment process)

# 3. Immediate verification (< 2 minutes)
# - Test login
# - Test protected route redirect
# - CRITICAL: Test booking form
# - CRITICAL: Test webhook endpoints
```

### Post-Enablement Monitoring (First Hour)

- [ ] Monitor error logs for auth failures
- [ ] Monitor booking form submissions (should continue working)
- [ ] Monitor webhook receipts (should continue working)
- [ ] Check session creation in database
- [ ] Verify no increase in 401/403 errors

### If Issues Occur

1. **Immediate Rollback:**
   ```bash
   # Set ENABLE_AUTH_PROTECTION=false
   # Restart server
   ```

2. **Investigate:**
   - Check server logs
   - Check database connection
   - Verify environment variables
   - Review middleware logic

3. **Fix and Re-test:**
   - Fix issue
   - Re-run verification checklist
   - Re-enable in staging first

---

## Non-Negotiables

### DO NOT Modify
- ❌ Pricing logic
- ❌ Automation execution
- ❌ Booking form behavior
- ❌ Stripe/webhook handling
- ❌ Business logic

### ONLY Modify
- ✅ Authentication configuration
- ✅ Session management
- ✅ Route protection rules
- ✅ Login/logout UI

### Always
- ✅ Test rollback first
- ✅ Keep flag default `false`
- ✅ Verify public routes work
- ✅ Enable in staging before production
- ✅ Enable during low-traffic window

---

## Success Criteria

**Ready for Production When:**
- ✅ All 16 tests pass
- ✅ All critical tests (9, 10, 11) pass
- ✅ Rollback tested and verified
- ✅ Staging tested (if available)
- ✅ Admin user(s) created
- ✅ Environment variables configured
- ✅ Documentation complete

**DO NOT Enable if:**
- ❌ Any critical test fails
- ❌ Rollback not tested
- ❌ Admin user not created
- ❌ Environment variables missing

---

## Support

If you encounter issues:

1. **Check Logs:**
   - Server console output
   - Browser console
   - Database logs

2. **Verify Configuration:**
   - Environment variables
   - Database connection
   - Prisma schema

3. **Test Rollback:**
   - Always test rollback first
   - Verify it works before troubleshooting

4. **Common Issues:**
   - User not found → Create user with script
   - Invalid password → Verify hash in database
   - Session not persisting → Check NEXTAUTH_SECRET
   - Redirect loop → Check NEXTAUTH_URL matches domain

