# Feature Flag Implementation Summary

## Overview
Implemented feature flag support for enabling/disabling the messaging inbox UI in local development and staging environments.

## Files Changed

### 1. `src/lib/flags.ts` (NEW)
- **Purpose**: Centralized feature flag helper
- **Function**: `isMessagingEnabled()`
- **Logic**:
  - Client-side: Checks `process.env.NEXT_PUBLIC_ENABLE_MESSAGING_V1 === 'true'`
  - Server-side: Checks both `NEXT_PUBLIC_ENABLE_MESSAGING_V1` and `ENABLE_MESSAGING_V1`
  - Returns `false` if neither is set to `'true'`

### 2. `src/app/messages/page.tsx`
- **Changes**:
  - Imported `isMessagingEnabled` from `@/lib/flags`
  - Updated flag checking logic:
    - Checks client-side env var immediately (no API wait)
    - Falls back to API `/api/messages/me` for role/confirmation if client flag is enabled
    - Uses client flag if API fails or returns disabled
  - Added "Messaging: ON/OFF" badge (owner-only) in PageHeader actions
- **Flag Check Location**: Client-side (component is `'use client'`)
- **Badge Display**: Only visible to owners, shows in PageHeader actions area

### 3. `.env.example`
- **Added**:
  ```bash
  NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

### 4. `README.md`
- **Added "Local Messaging Setup" section**:
  - Instructions to copy `.env.example` to `.env.local`
  - Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true`
  - Restart dev server
- **Added "Staging Messaging Enablement" section**:
  - Instructions for Render Dashboard
  - Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in environment variables
  - Redeploy and verify

## How Flag is Checked

### Client-Side (Messages Page)
1. **Immediate Check**: `isMessagingEnabled()` reads `NEXT_PUBLIC_ENABLE_MESSAGING_V1` from `process.env`
2. **Initial State**: Sets `messagingV1Enabled` state to client flag value immediately
3. **API Confirmation**: If client flag is `true`, fetches `/api/messages/me` for:
   - Role confirmation (owner vs sitter)
   - Server-side flag confirmation
   - Sitter messages flag
4. **Fallback**: If API fails or returns disabled, uses client flag value

### Server-Side (API Routes)
- API routes check `env.ENABLE_MESSAGING_V1` (from `src/lib/env.ts`)
- `/api/messages/me` returns 404 if server flag is `false`
- Client falls back to client-side flag if API returns 404

## Environment Variables

### Required for Messaging UI
- `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` - **Client-accessible** (required for client components)
- `ENABLE_MESSAGING_V1=true` - **Server-only** (optional, used by API routes)

### Recommended
- `NEXT_PUBLIC_API_URL=http://localhost:3001` - API server URL

## Local Development Setup

1. Copy example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Ensure `.env.local` contains:
   ```bash
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

4. Navigate to `/messages` - should see:
   - "Messaging: ON" badge (owner-only, top right)
   - Full inbox UI with thread list, message view, compose box, etc.

## Staging Setup (Render)

1. Go to Render Dashboard → Your Web Service → Environment
2. Add environment variable:
   - Key: `NEXT_PUBLIC_ENABLE_MESSAGING_V1`
   - Value: `true`
3. Click "Save Changes" (triggers redeploy)
4. Wait for deployment
5. Verify `/messages` shows inbox UI with "Messaging: ON" badge

## Visual Indicator

- **Location**: Top right of `/messages` page (PageHeader actions)
- **Visibility**: Owner-only
- **Display**: Badge showing "Messaging: ON" (green) or "Messaging: OFF" (red)
- **Purpose**: Runtime confirmation of flag status

## Flag States

### When `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true`
- ✅ Shows full inbox UI in Conversations tab
- ✅ Shows "Messaging: ON" badge (owner-only)
- ✅ All messaging features available (threads, messages, routing, retries, policy handling)

### When `NEXT_PUBLIC_ENABLE_MESSAGING_V1=false` (or unset)
- ❌ Shows "Messaging is disabled" empty state
- ❌ Shows "Messaging: OFF" badge (owner-only)
- ❌ Templates tab still works normally

## Testing

### Test Flag ON
1. Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in `.env.local`
2. Restart server
3. Navigate to `/messages` as owner
4. Should see: "Messaging: ON" badge + full inbox UI

### Test Flag OFF
1. Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=false` in `.env.local`
2. Restart server
3. Navigate to `/messages` as owner
4. Should see: "Messaging: OFF" badge + "Messaging is disabled" empty state

## Notes

- The flag is checked **client-side** because the messages page is a client component
- `NEXT_PUBLIC_*` prefix is required for Next.js to expose env vars to the browser
- Server-side API routes use `ENABLE_MESSAGING_V1` (without `NEXT_PUBLIC_`)
- The badge provides immediate visual feedback about flag status
- Badge is owner-only to avoid confusion for sitters
