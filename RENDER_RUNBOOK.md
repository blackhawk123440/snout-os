# Render Deployment Runbook

## Service Architecture

- **Web Service**: Next.js application (handles frontend + NextAuth)
- **API Service**: NestJS application (handles business logic, messaging, etc.)

## Environment Variables by Service

### A) Web Service (Next.js)

**Service Name:** `snout-os-web` (or your web service name)

**Required Environment Variables:**

```bash
# Authentication (CRITICAL)
NEXTAUTH_URL=https://snout-os-web.onrender.com
NEXTAUTH_SECRET=<64+ character random string>

# Messaging Feature Flags
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com

# Build Verification (Optional)
NEXT_PUBLIC_GIT_SHA=<commit-sha>
NEXT_PUBLIC_BUILD_TIME=<iso-timestamp>
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 48
```

**Note:** Web service does NOT need `DATABASE_URL` because:
- NextAuth uses JWT strategy (not database adapter)
- Session data is stored in JWT tokens (stateless)
- No database queries in session callback

### B) API Service (NestJS)

**Service Name:** `snout-os-api` (or your API service name)

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Redis
REDIS_URL=redis://default:password@host:port

# Authentication
JWT_SECRET=<64+ character random string>

# Encryption
ENCRYPTION_KEY=<32+ character random string>

# Provider Configuration
PROVIDER_MODE=mock|twilio
TWILIO_ACCOUNT_SID=<if using twilio>
TWILIO_AUTH_TOKEN=<if using twilio>
TWILIO_PHONE_NUMBER=<if using twilio>

# Feature Flags
ENABLE_MESSAGING_V1=true

# Optional
ALLOW_DEV_SEED=true
```

**Generate Secrets:**
```bash
# JWT_SECRET
openssl rand -base64 48

# ENCRYPTION_KEY (32 bytes = 44 base64 chars)
openssl rand -base64 32
```

## Step-by-Step Deployment

### 1. Set Web Service Environment Variables

1. Go to: https://dashboard.render.com
2. Select **Web Service** (`snout-os-web`)
3. Click **Environment** tab
4. Add each variable from section A above
5. **IMPORTANT:** Replace `snout-os-api.onrender.com` with your actual API service URL
6. Click **Save Changes**
7. Service will auto-redeploy

### 2. Set API Service Environment Variables

1. Select **API Service** (`snout-os-api`)
2. Click **Environment** tab
3. Add each variable from section B above
4. Click **Save Changes**
5. Service will auto-redeploy

### 3. Verify Services Are Running

- Web: `https://snout-os-web.onrender.com` → Should show login page
- API: `https://snout-os-api.onrender.com/api/health` → Should return `{ status: "ok" }`

## Deterministic Verification Sequence

### Step 1: Check Auth Health

```bash
curl https://snout-os-web.onrender.com/api/auth/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "env": {
    "NEXTAUTH_URL": "https://***",
    "NEXTAUTH_SECRET_PRESENT": true,
    "NEXTAUTH_SECRET_VALID": true,
    "NEXTAUTH_SECRET_LENGTH": 64,
    "NEXT_PUBLIC_API_URL": "https://snout-os-api.onrender.com",
    "NODE_ENV": "production"
  },
  "providers": ["credentials"],
  "canReadSession": {
    "hasSession": false,
    "userRole": null,
    "error": null
  }
}
```

**Verify:**
- ✅ `NEXTAUTH_SECRET_PRESENT: true`
- ✅ `NEXTAUTH_SECRET_VALID: true` (length >= 32)
- ✅ `NEXT_PUBLIC_API_URL` matches your API service URL

### Step 2: Login

1. Visit: `https://snout-os-web.onrender.com/login`
2. Enter credentials:
   - Email: `owner@example.com`
   - Password: `password` (or your seeded password)
3. Click "Sign in"
4. **Expected:** Redirects to `/dashboard`

### Step 3: Verify Session

```bash
curl -b cookies.txt -c cookies.txt https://snout-os-web.onrender.com/api/auth/session
```

**After login, expected response:**
```json
{
  "user": {
    "id": "...",
    "email": "owner@example.com",
    "name": "...",
    "sitterId": null
  },
  "expires": "..."
}
```

**Verify:**
- ✅ Status: 200
- ✅ `user` is not null
- ✅ `user.email` matches logged-in user

### Step 4: Confirm Redirect to Dashboard

1. After login, URL should be: `https://snout-os-web.onrender.com/dashboard`
2. Page should load (not redirect back to login)
3. **Expected:** Dashboard content visible

### Step 5: Refresh and Remain Logged In

1. Press `F5` or refresh browser
2. **Expected:** Still on `/dashboard`, not redirected to `/login`
3. Check browser DevTools → Application → Cookies
4. **Expected:** Cookie `__Secure-next-auth.session-token` exists

### Step 6: Verify Messaging Integration

1. Visit: `https://snout-os-web.onrender.com/messages`
2. Open browser DevTools → Console
3. **Expected:** Diagnostics panel visible (owner-only)
4. **Verify diagnostics show:**
   - ✅ `NEXT_PUBLIC_ENABLE_MESSAGING_V1 = true`
   - ✅ `API Base URL (resolved) = https://snout-os-api.onrender.com`
   - ✅ `Last Fetch: /api/messages/threads` → Status: 200
   - ✅ `Threads: X found` (where X > 0 if seeded)

**If threads fetch fails:**
- ❌ Status 401 → API JWT auth mismatch
- ❌ Status 404 → Wrong API base URL or route not deployed
- ❌ Status 0 → Network error (CORS or API down)

## Troubleshooting

### Issue: `/api/auth/health` shows `NEXTAUTH_SECRET_PRESENT: false`

**Fix:**
1. Go to Render → Web Service → Environment
2. Add `NEXTAUTH_SECRET` with 64+ character value
3. Save and redeploy

### Issue: Login redirects back to `/login`

**Check:**
1. `/api/auth/health` → `NEXTAUTH_SECRET_VALID: true`?
2. `/api/auth/session` after login → returns user?
3. Browser cookies → session cookie exists?
4. `NEXTAUTH_URL` matches actual web service URL?

**Fix:**
- Ensure `NEXTAUTH_URL` is exactly `https://snout-os-web.onrender.com` (no trailing slash)
- Ensure `NEXTAUTH_SECRET` is 64+ characters
- Check browser console for errors

### Issue: `/messages` shows "API Base URL: http://localhost:3001"

**Fix:**
1. Go to Render → Web Service → Environment
2. Set `NEXT_PUBLIC_API_URL=https://snout-os-api.onrender.com`
3. Save and redeploy
4. **Note:** Must rebuild for `NEXT_PUBLIC_*` vars to take effect

### Issue: `/api/messages/threads` returns 401

**Fix:**
1. API service needs `JWT_SECRET` set
2. Web service needs to send JWT in Authorization header
3. Check API service logs for auth errors

### Issue: `/api/messages/threads` returns 404

**Fix:**
1. Verify API service is deployed and running
2. Check `NEXT_PUBLIC_API_URL` matches actual API service URL
3. Test API directly: `curl https://snout-os-api.onrender.com/api/messages/threads`

## Quick Reference

**Web Service URL:** `https://snout-os-web.onrender.com`  
**API Service URL:** `https://snout-os-api.onrender.com`

**Critical Env Vars:**
- Web: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`
- API: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

**Verification Endpoints:**
- `/api/auth/health` - Auth configuration
- `/api/auth/session` - Current session
- `/api/messages/threads` - Messaging API connectivity
