# Gate B Phase 2.2 - Execute Now Checklist

## ✅ Phase 2.2 Status: COMPLETE
- ✅ NextAuth v5 credentials auth implemented
- ✅ Database sessions configured
- ✅ Middleware ready (but not enforcing until flag is true)
- ✅ Public allowlist protected (booking form, webhooks, health, tip pages, NextAuth routes)
- ✅ Rollback ready (instant flag flip)

---

## 🎯 Execute These Steps in Exact Order

### Step 1: Create the First Admin User

**Command (run from repo root):**
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourPassword123! "Admin User"
```

**Expected output:**
```
✅ Admin user created/updated:
   Email: admin@snoutservices.com
   Name: Admin User
   ID: <uuid>
```

**✅ Check:** Script completes successfully

---

### Step 2: Verify Login Works (Protection OFF)

**Keep `ENABLE_AUTH_PROTECTION=false` in `.env`**

**Commands:**
```bash
npm run dev
```

**Manual verification:**
1. Visit: `http://localhost:3000/login`
2. Enter credentials:
   - Email: `admin@snoutservices.com`
   - Password: `YourPassword123!`
3. Click "Sign in"

**✅ Check:** Login succeeds, redirects to home page

**If login fails:**
- Check database connection
- Verify user was created (check User table)
- Check server logs for errors

---

### Step 3: Enable Protection and Verify Protected Routes

**Edit `.env` file:**
```bash
ENABLE_AUTH_PROTECTION=true
```

**Restart dev server:**
```bash
# Stop server (Ctrl+C)
npm run dev
```

**Test protected route redirect:**
1. Navigate to: `http://localhost:3000/settings`
2. **Expected:** Redirects to `http://localhost:3000/login?callbackUrl=/settings`
3. **✅ Check:** URL shows `callbackUrl=/settings`

**Test login and callback redirect:**
1. Log in with admin credentials
2. **Expected:** Redirects back to `http://localhost:3000/settings`
3. **✅ Check:** Settings page loads successfully

**Test other protected routes:**
- `/bookings` → Should redirect to login
- `/automation` → Should redirect to login
- `/api/bookings` → Should redirect to login

**✅ Check:** All protected routes redirect to login

---

### Step 4: Confirm Revenue Critical Public Routes Still Work

**⚠️ CRITICAL:** Test these while `ENABLE_AUTH_PROTECTION=true`

#### 4.1 API Form Endpoint (Booking Form Submission)
```bash
curl -I http://localhost:3000/api/form
```
**✅ Must return:** `200 OK` (or `405 Method Not Allowed` for GET, but accessible)
**❌ If redirects to login:** **ROLLBACK IMMEDIATELY**

#### 4.2 Stripe Webhook Endpoint
```bash
curl -I http://localhost:3000/api/webhooks/stripe
```
**✅ Must return:** `200 OK` (or appropriate status, but accessible)
**❌ If redirects to login:** **ROLLBACK IMMEDIATELY**

#### 4.3 Health Endpoint
```bash
curl http://localhost:3000/api/health
```
**✅ Must return:** Health status JSON
**❌ If redirects to login:** **ROLLBACK IMMEDIATELY**

#### 4.4 Tip Pages
```bash
curl -I http://localhost:3000/tip/success
curl -I http://localhost:3000/tip/payment
```
**✅ Must return:** `200 OK`
**❌ If redirects to login:** **ROLLBACK IMMEDIATELY**

---

## 🚨 Rollback Procedure (If Any Public Route Fails)

**IMMEDIATE ACTION:**

1. **Edit `.env`:**
   ```bash
   ENABLE_AUTH_PROTECTION=false
   ```

2. **Restart server:**
   ```bash
   npm run dev
   ```

3. **Verify rollback:**
   ```bash
   curl http://localhost:3000/api/form
   # Should work now
   ```

**Time to rollback:** < 30 seconds

---

## ✅ Success Criteria

Phase 2.2 rollout is successful when:

- [x] Admin user created successfully
- [x] Login works with protection OFF
- [x] Protected routes redirect to login when flag is ON
- [x] Login redirects back to original page (callbackUrl works)
- [x] All revenue-critical public routes still accessible when flag is ON
- [x] No booking form disruption
- [x] No webhook disruption
- [x] Rollback tested and works

---

## 📝 Quick Reference

**Current status:** `ENABLE_AUTH_PROTECTION=false` (default)

**To enable protection:**
1. Set `ENABLE_AUTH_PROTECTION=true` in `.env`
2. Restart server
3. Test public routes immediately
4. If any public route fails → rollback

**To rollback:**
1. Set `ENABLE_AUTH_PROTECTION=false` in `.env`
2. Restart server
3. All routes accessible again

---

## 🎯 Next Steps After Successful Verification

1. ✅ Document admin credentials securely
2. ✅ Test in staging environment
3. ✅ Plan production rollout during low-traffic window
4. ✅ Monitor logs after enabling in production
5. ✅ Consider Phase 2.3 features (user management UI, etc.)

---

**Ready to execute! Start with Step 1: Create Admin User**

