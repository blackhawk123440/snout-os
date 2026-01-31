# Login Loop Root Cause Analysis & Fix

## Root Cause Categories Identified

### Category B: NEXTAUTH_URL Mismatch (PRIMARY)
**Evidence:**
- NextAuth behind Render proxy needs `trustHost: true`
- NEXTAUTH_URL must match actual deployment URL

**Fix Applied:**
- Added `trustHost: true` to NextAuth config
- Cookie settings configured for HTTPS

### Category A: Cookies Not Being Set (SECONDARY)
**Evidence:**
- Cookies need `Secure` flag on HTTPS
- Cookie name changes in production (`__Secure-` prefix)

**Fix Applied:**
- Configured cookies with `secure: true` in production
- Set `sameSite: 'lax'` for cross-site compatibility
- Proper cookie name based on environment

### Category E: Session Verification Before Redirect (TERTIARY)
**Evidence:**
- Redirect happening before session cookie is set
- Need to verify session exists before redirecting

**Fix Applied:**
- Login now verifies `/api/auth/session` returns user before redirecting
- Uses `window.location.href` for hard redirect (not router.push)
- Retry logic if session not immediately available

## Code Changes Made

### 1. `/api/auth/health` endpoint
- Shows NEXTAUTH_SECRET_PRESENT, NEXTAUTH_SECRET_VALID, NEXTAUTH_URL
- Tests session reading with `getServerSession()`
- Never exposes secret value

### 2. AuthDebugPanel component
- Shows on `/login` (dev/owner only)
- Displays: current URL, auth health, session status, CSRF status, cookies, signIn results
- Updates in real-time

### 3. NextAuth configuration fixes
- `trustHost: true` - for Render proxy
- Cookie settings for HTTPS (Secure flag)
- Session callback uses JWT token only (no DB query)
- sitterId stored in JWT token

### 4. Login page fixes
- Verifies session exists before redirecting
- Uses `window.location.href` for hard redirect
- Stores signIn result for debug panel
- Better error messages

### 5. Public routes
- Ensured `/api/auth/*` is public
- Ensured `/login` is public

## Required Render Environment Variables

**WEB Service → Environment tab:**

```bash
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<64+ char random - generate with: openssl rand -base64 48>
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://snout-os-staging.onrender.com
DATABASE_URL=<your-postgres-url>
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 48
```

## Definition of Done

After setting env vars and redeploying:

1. ✅ `/api/auth/health` shows:
   - `NEXTAUTH_SECRET_PRESENT: true`
   - `NEXTAUTH_SECRET_VALID: true` (length >= 32)
   - `NEXTAUTH_URL_RAW: https://snout-os-staging.onrender.com`
   - `canReadSession.hasSession: true` (after login)

2. ✅ `/api/auth/session` returns:
   - Status: 200
   - Body: `{ user: { id, email, name } }` (not null)

3. ✅ Browser has session cookie:
   - `__Secure-next-auth.session-token` (production)
   - OR `next-auth.session-token` (development)

4. ✅ User redirects to `/dashboard` after login
5. ✅ User remains logged in after page refresh

## Network Sequence (Expected)

After clicking "Sign in":

1. `POST /api/auth/csrf` → 200 (CSRF token)
2. `POST /api/auth/callback/credentials` → 302 or 200
3. `GET /api/auth/session` → 200 with `{ user: {...} }`
4. Browser redirects to `/dashboard`
5. `GET /dashboard` → 200 (authenticated)

## Diagnostic Endpoints

- `/api/auth/health` - Configuration status
- `/api/auth/session` - Current session
- `/api/auth/csrf` - CSRF token
- `/login` - Shows AuthDebugPanel (dev/owner only)

## Commits

- `72e9952` - Add auth diagnostics and fix login loop root causes
- `8ff2c19` - Complete login redirect fix and add Render env var documentation
- `2077338` - Add trustHost to NextAuth config
