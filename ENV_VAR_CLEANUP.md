# Environment Variable Cleanup Guide

## 🚨 Critical Issue: Trailing Newlines

Your `NEXTAUTH_URL` has a trailing newline character (`\n`). This must be fixed!

## How to Fix in Render

### Method 1: Edit in Dashboard (Recommended)

1. Go to: https://dashboard.render.com/web/srv-d5abmh3uibrs73boq1kg/env
2. Find `NEXTAUTH_URL`
3. Click to edit
4. **Delete the entire value**
5. **Type it fresh** (don't copy/paste): `https://snout-os-staging.onrender.com`
6. Make sure cursor is at the end - no extra spaces or newlines
7. Click "Save"

### Method 2: Use Render API (Advanced)

If you have Render API access, you can update via API, but dashboard is easier.

## Variables to Check

Check these for trailing newlines/spaces:

1. ✅ `NEXTAUTH_URL` - **HAS TRAILING NEWLINE - FIX THIS**
2. ⚠️ `NEXT_PUBLIC_API_URL` - Verify no trailing newline
3. ⚠️ `NEXT_PUBLIC_BASE_URL` - Verify no trailing newline
4. ⚠️ `JWT_SECRET` - Verify no trailing newline

## Verification

After fixing, test:
```bash
curl -s https://snout-os-staging.onrender.com/api/auth/health | jq .env.NEXTAUTH_URL_RAW
```

Should show: `"https://snout-os-staging.onrender.com"` (no `\n` visible)

## Why This Causes Build Failures

Trailing newlines can cause:
- NextAuth configuration errors
- URL parsing failures
- Cookie domain issues
- Build-time environment variable validation failures

Fix this first, then try deploying again!
