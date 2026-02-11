# URL Verification Guide

## Required URLs for Web Service (`snout-os-staging`)

### 1. `NEXT_PUBLIC_API_URL`
**Value**: `https://snout-os-api.onrender.com`

**Where it's used**:
- `src/app/api/[...path]/route.ts` - BFF proxy forwards requests to this URL
- This is the NestJS API server URL

**How to verify**:
```bash
curl -i https://snout-os-api.onrender.com/health
```
Should return: `HTTP/1.1 200 OK` with `{ status: "ok" }`

### 2. `NEXTAUTH_URL`
**Value**: `https://snout-os-staging.onrender.com`

**Where it's used**:
- `src/lib/auth.ts` - NextAuth.js configuration
- Must be the full URL (not just domain)
- Used for cookie domain and callback URLs

**How to verify**:
```bash
curl -i https://snout-os-staging.onrender.com/api/auth/health
```
Should return: `HTTP/1.1 200 OK` with NextAuth config info

### 3. `NEXT_PUBLIC_BASE_URL` (optional but recommended)
**Value**: `https://snout-os-staging.onrender.com`

**Where it's used**:
- Various frontend components for absolute URLs
- Redirects and links

### 4. `JWT_SECRET` (not a URL, but critical)
**Value**: Must match the API service's `JWT_SECRET`

**Where it's used**:
- `src/lib/api/jwt.ts` - BFF proxy mints JWT tokens using this
- Must be the SAME value as on the API service

## Verification Steps

### Step 1: Verify API is accessible
```bash
curl -i https://snout-os-api.onrender.com/health
```
**Expected**: `200 OK` with JSON response

### Step 2: Verify Web service is accessible
```bash
curl -i https://snout-os-staging.onrender.com/api/auth/health
```
**Expected**: `200 OK` with NextAuth config

### Step 3: Check environment variables in Render
1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env
2. Verify these exact values:
   - `NEXT_PUBLIC_API_URL` = `https://snout-os-api.onrender.com`
   - `NEXTAUTH_URL` = `https://snout-os-staging.onrender.com`
   - `JWT_SECRET` = (should match API service)

### Step 4: Verify JWT_SECRET matches API service
1. Go to API service: `snout-os-api` → Environment
2. Compare `JWT_SECRET` value with Web service
3. They MUST be identical

## Common URL Mistakes

### ❌ Wrong: Missing `https://`
- `NEXTAUTH_URL` = `snout-os-staging.onrender.com` (missing protocol)
- **Fix**: Must be `https://snout-os-staging.onrender.com`

### ❌ Wrong: Trailing slash
- `NEXTAUTH_URL` = `https://snout-os-staging.onrender.com/` (trailing slash)
- **Fix**: Remove trailing slash

### ❌ Wrong: Wrong service URL
- `NEXT_PUBLIC_API_URL` = `https://snout-os-staging.onrender.com` (should be API, not Web)
- **Fix**: Must be `https://snout-os-api.onrender.com`

### ❌ Wrong: JWT_SECRET mismatch
- Web service `JWT_SECRET` ≠ API service `JWT_SECRET`
- **Fix**: Copy exact value from API service to Web service

## Quick Verification Script

Run these commands to verify URLs are correct:

```bash
# 1. Check API is up
echo "Checking API health..."
curl -s https://snout-os-api.onrender.com/health | jq .

# 2. Check Web service NextAuth
echo -e "\nChecking Web NextAuth..."
curl -s https://snout-os-staging.onrender.com/api/auth/health | jq .

# 3. Check if proxy would work (requires login, but shows if route exists)
echo -e "\nChecking proxy route (should be 401 if not logged in)..."
curl -i https://snout-os-staging.onrender.com/api/messages/threads
# Expected: 401 Unauthorized (not 404 - means route exists)
```

## What the URLs Do

### `NEXT_PUBLIC_API_URL`
- Used by BFF proxy to forward requests
- Browser → Web service (`/api/messages/threads`) → API service (`https://snout-os-api.onrender.com/api/messages/threads`)

### `NEXTAUTH_URL`
- Used by NextAuth.js for:
  - Cookie domain
  - Callback URLs
  - Session management
- Must match the Web service's public URL exactly

### `JWT_SECRET`
- Used by BFF proxy to mint JWT tokens
- API service validates these tokens
- Must match between Web and API services
