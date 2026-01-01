# Phase 2.2 Rollout - Step-by-Step Commands

## Quick Reference Command List

### Step 1: Create Admin User

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npx tsx scripts/create-admin-user.ts admin@snoutservices.com YourSecurePassword123! "Admin User"
```

**Expected output:**
```
✅ Admin user created/updated:
   Email: admin@snoutservices.com
   Name: Admin User
   ID: <uuid>
```

---

### Step 2: Start Dev Server (Protection OFF)

```bash
# Ensure ENABLE_AUTH_PROTECTION=false in .env
npm run dev
```

**Verify:**
- Login page: http://localhost:3000/login
- Settings page: http://localhost:3000/settings (should load, no redirect)
- Bookings API: `curl http://localhost:3000/api/bookings` (should return data)

---

### Step 3: Test Login Flow (Protection OFF)

**In browser:**
1. Navigate to: http://localhost:3000/login
2. Enter admin email and password
3. Click "Sign in"
4. Should redirect to home page (`/`)

**Verify all routes still accessible:**
```bash
# Test protected routes (should all work without redirect)
curl -I http://localhost:3000/settings
curl -I http://localhost:3000/bookings
curl http://localhost:3000/api/bookings

# Test public routes (must work)
curl http://localhost:3000/api/health
curl http://localhost:3000/api/form
```

---

### Step 4: Enable Protection

**Edit `.env` file:**
```bash
# Change this line:
ENABLE_AUTH_PROTECTION=true
```

**Restart server:**
```bash
# Stop server (Ctrl+C), then:
npm run dev
```

---

### Step 5: Test Protection (Flag ON)

**Test protected route redirect:**
```bash
# Should redirect to login (status 307)
curl -I http://localhost:3000/settings
# Expected: Location: /login?callbackUrl=/settings

curl -I http://localhost:3000/bookings
# Expected: Location: /login?callbackUrl=/bookings

curl -I http://localhost:3000/api/bookings
# Expected: Location: /login?callbackUrl=/api/bookings
```

**Test public routes (MUST still work):**
```bash
# These should return 200 OK (no redirect)
curl -I http://localhost:3000/api/health
# Expected: HTTP/1.1 200 OK

curl -I http://localhost:3000/api/form
# Expected: HTTP/1.1 200 OK (or 405 Method Not Allowed for GET, but accessible)

curl -I http://localhost:3000/booking-form.html
# Expected: HTTP/1.1 200 OK
```

**Manual browser test:**
1. Navigate to: http://localhost:3000/settings
2. Should redirect to: http://localhost:3000/login?callbackUrl=/settings
3. Log in with admin credentials
4. Should redirect back to: http://localhost:3000/settings
5. Settings page should load successfully

---

### Step 6: Rollback (If Needed)

**Edit `.env` file:**
```bash
ENABLE_AUTH_PROTECTION=false
```

**Restart server:**
```bash
npm run dev
```

**Verify rollback:**
```bash
# All routes should work again
curl http://localhost:3000/api/bookings
# Should return data (no redirect)
```

---

## Production Rollout Commands

### Pre-Production: Create Admin User

```bash
# Connect to production database first
# Set DATABASE_URL in .env or use connection string

npx tsx scripts/create-admin-user.ts admin@production.com SecureProdPassword! "Admin User"
```

### Production: Enable Protection

1. **Set environment variable in production:**
   ```
   ENABLE_AUTH_PROTECTION=true
   ```

2. **Deploy/Restart application**

3. **Immediate verification:**
   ```bash
   # Test public routes (critical!)
   curl https://your-domain.com/api/health
   curl https://your-domain.com/api/form
   
   # Test protected route redirect
   curl -I https://your-domain.com/settings
   # Should redirect to login
   ```

### Production: Rollback (Emergency)

1. **Set environment variable:**
   ```
   ENABLE_AUTH_PROTECTION=false
   ```

2. **Restart application**

3. **Verify:**
   ```bash
   curl https://your-domain.com/api/form
   # Should work (no redirect)
   ```

---

## Verification Checklist Commands

### Quick Health Check

```bash
# Run all critical checks at once
echo "=== Public Routes ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/form
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/booking-form.html

echo -e "\n=== Protected Routes (should redirect when flag ON) ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/settings
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/bookings
```

**Expected with flag OFF:**
- All return 200

**Expected with flag ON:**
- Public routes: 200
- Protected routes: 307 (redirect)

---

## Database Verification Commands

### Check User Exists

```bash
npx prisma studio
# Navigate to User table, verify admin user exists
```

### Check Session Created After Login

```bash
npx prisma studio
# Navigate to Session table
# Should see session record after logging in
```

### Manual Database Query

```bash
# Connect to database and check:
# SELECT * FROM "User" WHERE email = 'admin@snoutservices.com';
# Should return user with passwordHash set
```

