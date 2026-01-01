# Gate B Phase 2.2 Verification & Rollout Guide

## Prerequisites Checklist

Before starting, ensure:
- [ ] Phase 2.2 implementation is complete
- [ ] `npm install` has been run (bcryptjs installed)
- [ ] Database is accessible and migrations are applied
- [ ] `.env` file exists with `NEXTAUTH_SECRET` set
- [ ] `ENABLE_AUTH_PROTECTION=false` in `.env` (default)

---

## Step 1: Create First Admin User

**⚠️ MANDATORY:** Do this before enabling protection!

### Command
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npx tsx scripts/create-admin-user.ts <your-email> <your-password> "Admin User"
```

### Example
```bash
npx tsx scripts/create-admin-user.ts admin@snoutservices.com SecurePassword123! "Admin User"
```

### Expected Output
```
✅ Admin user created/updated:
   Email: admin@snoutservices.com
   Name: Admin User
   ID: <uuid>
```

### Verification
- [ ] Script runs without errors
- [ ] Success message displays
- [ ] User email and name are correct
- [ ] User ID is displayed

### Troubleshooting
- **"Cannot find module"**: Run `npm install` first
- **Database connection error**: Check `DATABASE_URL` in `.env`
- **User already exists**: Script will update existing user (this is fine)

---

## Step 2: Verify Login Works (Protection OFF)

**Goal:** Confirm login page works before enabling protection.

### Commands
```bash
# Start dev server
npm run dev
```

### Manual Testing

#### 2.1 Visit Login Page
- [ ] Navigate to `http://localhost:3000/login`
- [ ] Login page loads successfully
- [ ] Email and password input fields are visible
- [ ] "Sign in" button is visible

#### 2.2 Test Login with Invalid Credentials
- [ ] Enter invalid email/password
- [ ] Click "Sign in"
- [ ] Error message appears: "Invalid email or password"
- [ ] Page does not redirect

#### 2.3 Test Login with Valid Credentials
- [ ] Enter the admin email/password you created in Step 1
- [ ] Click "Sign in"
- [ ] **Expected:** Redirects to `/` (home page)
- [ ] **Alternative:** May show success but stay on page (check browser console for errors)

#### 2.4 Verify All Routes Still Accessible
With `ENABLE_AUTH_PROTECTION=false`, all routes should work:
- [ ] `/settings` → Loads (no redirect)
- [ ] `/bookings` → Loads (no redirect)
- [ ] `/api/bookings` → Returns data (no redirect)
- [ ] `/api/form` → Accessible (public route)
- [ ] `/api/health` → Returns health status (public route)

### Pass/Fail Criteria

| Test | Expected Result | Pass/Fail | Notes |
|------|----------------|-----------|-------|
| Login page loads | Page displays with form | ⬜ | |
| Invalid credentials | Error message shown | ⬜ | |
| Valid credentials | Redirects to home | ⬜ | |
| Settings page | Loads without redirect | ⬜ | |
| Bookings page | Loads without redirect | ⬜ | |
| Booking API | Returns data | ⬜ | |
| Public routes | All accessible | ⬜ | |

**⚠️ STOP HERE if any tests fail!** Fix issues before proceeding.

---

## Step 3: Enable Protection (SAFE TESTING)

**⚠️ Only proceed if Step 2 passes completely!**

### 3.1 Update Environment Variable

Edit `.env` file:
```bash
# Change this line:
ENABLE_AUTH_PROTECTION=true
```

**Important:** Keep all other env vars unchanged!

### 3.2 Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### 3.3 Test Protected Routes Redirect

#### Test Protected Pages
Navigate to each URL and verify redirect:

| Route | Expected Behavior | Pass/Fail | Notes |
|-------|------------------|-----------|-------|
| `http://localhost:3000/settings` | Redirects to `/login?callbackUrl=/settings` | ⬜ | |
| `http://localhost:3000/bookings` | Redirects to `/login?callbackUrl=/bookings` | ⬜ | |
| `http://localhost:3000/automation` | Redirects to `/login?callbackUrl=/automation` | ⬜ | |
| `http://localhost:3000/payments` | Redirects to `/login?callbackUrl=/payments` | ⬜ | |
| `http://localhost:3000/calendar` | Redirects to `/login?callbackUrl=/calendar` | ⬜ | |
| `http://localhost:3000/clients` | Redirects to `/login?callbackUrl=/clients` | ⬜ | |

#### Test Protected API Routes
Use curl or browser DevTools Network tab:

```bash
# Test bookings API (should redirect)
curl -v http://localhost:3000/api/bookings
```

| API Route | Expected Behavior | Pass/Fail | Notes |
|-----------|------------------|-----------|-------|
| `/api/bookings` | Redirects to `/login?callbackUrl=/api/bookings` | ⬜ | Status 307 |
| `/api/settings` | Redirects to `/login?callbackUrl=/api/settings` | ⬜ | Status 307 |
| `/api/automations` | Redirects to `/login?callbackUrl=/api/automations` | ⬜ | Status 307 |

### 3.4 Test CallbackUrl Redirect

**Critical Test:** This proves the redirect flow works correctly.

1. Navigate to `http://localhost:3000/settings`
2. Should redirect to `/login?callbackUrl=/settings`
3. URL should show `callbackUrl=/settings` in address bar
4. Log in with admin credentials
5. **Expected:** After login, redirects back to `/settings`
6. Settings page should load successfully

| Test | Expected Result | Pass/Fail | Notes |
|------|----------------|-----------|-------|
| CallbackUrl in URL | `/login?callbackUrl=/settings` | ⬜ | |
| Login redirects back | After login → `/settings` | ⬜ | |
| Target page loads | Settings page displays | ⬜ | |
| Session persists | Refresh page, still logged in | ⬜ | |

### 3.5 Test Public Routes (MUST STILL WORK)

**Critical:** These routes MUST remain accessible or revenue flow breaks!

| Route | Expected Behavior | Pass/Fail | Notes |
|-------|------------------|-----------|-------|
| `/api/form` | Accessible (200 OK) | ⬜ | Booking form submission |
| `/api/webhooks/stripe` | Accessible (200 OK) | ⬜ | Stripe webhook |
| `/api/webhooks/sms` | Accessible (200 OK) | ⬜ | SMS webhook |
| `/api/health` | Returns health status | ⬜ | Health check |
| `/tip/success` | Accessible | ⬜ | Tip payment success |
| `/tip/payment` | Accessible | ⬜ | Tip payment form |
| `/booking-form.html` | Accessible | ⬜ | Static booking form |
| `/api/auth/signin` | Accessible | ⬜ | NextAuth signin |
| `/login` | Accessible | ⬜ | Login page itself |

**⚠️ CRITICAL:** If ANY public route fails, ROLLBACK IMMEDIATELY!

### 3.6 Test Full Authentication Flow

1. **Logout Test**
   - [ ] Access a protected route while logged in
   - [ ] Add logout button (or navigate to `/api/auth/logout`)
   - [ ] Logout works
   - [ ] Redirects to `/login`
   - [ ] Try accessing protected route again → Redirects to login

2. **Session Persistence**
   - [ ] Log in
   - [ ] Access protected route
   - [ ] Refresh page (F5)
   - [ ] Should remain logged in (no redirect to login)
   - [ ] Close browser tab, reopen, navigate to protected route
   - [ ] Should redirect to login (session may expire)

---

## Step 4: Rollback Procedure

**If ANY test fails or behavior is unexpected:**

### Immediate Rollback (30 seconds)

1. **Edit `.env` file:**
   ```bash
   ENABLE_AUTH_PROTECTION=false
   ```

2. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Verify rollback:**
   - [ ] All routes accessible without login
   - [ ] No redirects to login page
   - [ ] Booking form works
   - [ ] Webhooks accessible

**Result:** System returns to Phase 2.1 behavior instantly. Zero code changes needed.

---

## Step 5: Production Rollout (Only After All Tests Pass)

### Pre-Production Checklist

- [ ] All Step 3 tests pass
- [ ] Admin user created in production database
- [ ] `NEXTAUTH_SECRET` set in production environment
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] Rollback plan documented and tested

### Staging Rollout

1. **Deploy to staging environment**
2. **Create admin user in staging DB:**
   ```bash
   npx tsx scripts/create-admin-user.ts <email> <password> "Admin User"
   ```
3. **Set `ENABLE_AUTH_PROTECTION=true` in staging**
4. **Run Step 3 verification tests in staging**
5. **Monitor logs for authentication errors**
6. **Test critical flows:**
   - [ ] Booking form submission works
   - [ ] Stripe webhook processing works
   - [ ] Admin can log in and access dashboard

### Production Rollout (Low-Traffic Window)

1. **Choose low-traffic window** (e.g., 2-4 AM local time)
2. **Create admin user(s) in production database**
3. **Set `ENABLE_AUTH_PROTECTION=true` in production**
4. **Deploy/Restart application**
5. **Immediately test:**
   - [ ] Admin can log in
   - [ ] Booking form still works
   - [ ] Webhooks still work
6. **Monitor for 15-30 minutes:**
   - [ ] Check error logs
   - [ ] Verify booking submissions succeed
   - [ ] Verify webhook processing works
7. **If issues occur:** Rollback immediately (set flag to `false`)

---

## Verification Summary Table

### Quick Pass/Fail Checklist

| Phase | Test | Status | Notes |
|-------|------|--------|-------|
| Step 1 | Admin user created | ⬜ | |
| Step 2 | Login page loads | ⬜ | |
| Step 2 | Login with valid credentials works | ⬜ | |
| Step 2 | All routes accessible (flag off) | ⬜ | |
| Step 3 | Protected routes redirect | ⬜ | |
| Step 3 | CallbackUrl redirect works | ⬜ | |
| Step 3 | Public routes still accessible | ⬜ | |
| Step 3 | Login flow works | ⬜ | |
| Step 3 | Logout works | ⬜ | |
| Step 3 | Session persists | ⬜ | |

---

## Troubleshooting Guide

### Issue: "Invalid email or password" but credentials are correct

**Possible causes:**
1. Password hash not created correctly
2. User not found in database
3. Email mismatch (case-sensitive)

**Solution:**
```bash
# Recreate user
npx tsx scripts/create-admin-user.ts <email> <password> "Admin User"

# Verify user exists
npx prisma studio
# Check User table, verify email and passwordHash exist
```

### Issue: Redirect loop

**Possible causes:**
1. `/login` is protected (should be public)
2. `NEXTAUTH_URL` mismatch
3. Session creation failing

**Solution:**
- Check `src/lib/public-routes.ts` - `/login` should be accessible
- Verify `NEXTAUTH_URL` matches actual URL
- Check browser console for errors
- Check server logs for NextAuth errors

### Issue: Public routes redirect to login

**Possible causes:**
1. Public routes not in allowlist
2. Middleware logic error

**Solution:**
- Check `src/lib/public-routes.ts` - all public routes listed
- Check `src/middleware.ts` - public route check happens before protected check
- **ROLLBACK IMMEDIATELY** if booking form doesn't work

### Issue: Session not persisting

**Possible causes:**
1. Database session table not created
2. `NEXTAUTH_SECRET` not set
3. Cookie issues

**Solution:**
- Run `npx prisma db push` to ensure Session table exists
- Verify `NEXTAUTH_SECRET` is set in `.env`
- Check browser allows cookies
- Check database for Session records after login

---

## Success Criteria

✅ **Phase 2.2 is successful when:**

1. Admin user can be created via script
2. Login page works and accepts credentials
3. With protection ON:
   - Protected routes redirect to login
   - Valid login redirects back to original page (callbackUrl)
   - Public routes (booking form, webhooks) remain accessible
   - Logout works
   - Sessions persist across page refreshes

✅ **Ready for production when:**

1. All Step 3 tests pass
2. Staging verification successful
3. Rollback procedure tested
4. Admin users created in production
5. Monitoring in place

---

## Next Steps After Successful Rollout

1. ✅ Document production admin credentials securely
2. ✅ Monitor authentication logs
3. ✅ Plan Phase 2.3 features (user management UI, password reset, etc.)
4. ✅ Consider adding OAuth providers (optional)
5. ✅ Add session management UI (optional)

---

## Emergency Contacts

If critical issues occur:
1. **Immediate:** Rollback (`ENABLE_AUTH_PROTECTION=false`)
2. **Check:** Public routes (booking form, webhooks) accessibility
3. **Verify:** Revenue flow still works
4. **Debug:** Check logs, database, environment variables

**Remember:** Revenue safety is top priority. If in doubt, rollback!
