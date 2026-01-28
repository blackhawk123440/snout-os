# Messaging UI Integration Summary

## Overview
Successfully integrated the new messaging UI from `enterprise-messaging-dashboard` into the existing Snout OS dashboard shell without changing the main dashboard UI, layout, or navigation.

## Changes Made

### 1. API Client & Hooks (`src/lib/api/`)
- **Created** `src/lib/api/client.ts` - Typed API client with JWT token handling, error normalization, and Zod validation
- **Created** `src/lib/api/hooks.ts` - React Query hooks for messaging API (threads, messages, routing, retries)

### 2. Messaging Components
- **Created** `src/components/messaging/InboxView.tsx` - New inbox component with:
  - Thread list with filters (unread, policy violations, delivery failures, search)
  - Message view with delivery status badges
  - Routing explanation drawer ("Why routed here?")
  - Compose box (thread-bound only)
  - Retry failed deliveries
  - Policy violation handling with owner override
  - Polling (threads 5s, messages 3s)

### 3. Messages Page (`src/app/messages/page.tsx`)
- **Updated** to use `InboxView` component in the "Conversations" tab when `ENABLE_MESSAGING_V1=true`
- **Preserved** existing tabs structure (Conversations, Owner Inbox, Templates)
- **Maintained** feature flag gating - shows "Messaging is disabled" empty state when flag is off
- **Kept** Templates tab functionality unchanged

### 4. Sitters Page (`src/app/sitters/[id]/page.tsx`)
- **Added** "Messaging" section showing:
  - Sitter messaging status (Active/Inactive)
  - Business number (masked number) - shows "Not assigned" if none
  - Active assignment windows count (optional)
  - "Open Inbox" button that deep-links to `/messages?sitterId={sitterId}`
- **Updated** Quick Actions button from "Send Message" to "Open Inbox"
- **Added** messaging section to both mobile and desktop views
- **No changes** to existing sitter profile layout

### 5. API Route Updates
- **Updated** `src/app/api/sitters/[id]/route.ts` to include:
  - `maskedNumber` - sitter's assigned business number (from SitterMaskedNumber or MessageNumber)
  - `activeAssignmentWindowsCount` - count of active assignment windows

### 6. Build Stamp (`src/components/ui/BuildHash.tsx`)
- **Enhanced** to show commit SHA (first 7 chars) + build time
- **Owner-only** visibility (uses NextAuth session check)
- Format: `Build: abc1234 | 2026-01-28 12:00:00`

### 7. Inbox Redirect (`src/app/inbox/page.tsx`)
- **Created** redirect page that routes `/inbox` → `/messages`

### 8. Providers (`src/components/providers.tsx`)
- **Added** `QueryClientProvider` from `@tanstack/react-query` for React Query hooks

## Routes & Deep-Linking

### Main Routes
- `/messages` - Main messaging entrypoint (unchanged route)
  - Conversations tab → New inbox UI (when `ENABLE_MESSAGING_V1=true`)
  - Owner Inbox tab → New inbox UI (owner-only, when flag enabled)
  - Templates tab → Existing template UI (unchanged)

### Deep-Linking from Sitters
- `/messages?sitterId={sitterId}` - Filters threads to show only those assigned to the sitter
- `/messages?thread={threadId}` - Opens specific thread (future enhancement)

## Feature Flag Behavior

### `ENABLE_MESSAGING_V1=false` (default)
- `/messages` shows: "Messaging is disabled. Enable ENABLE_MESSAGING_V1 to use messaging features."
- Templates tab still works
- Sitters page messaging section shows "Not assigned" for business number

### `ENABLE_MESSAGING_V1=true`
- `/messages` Conversations tab shows new inbox UI
- `/messages` Owner Inbox tab shows new inbox UI (owner-only)
- Sitters page messaging section shows actual data
- All messaging features enabled

## Files Changed

### New Files
- `src/lib/api/client.ts`
- `src/lib/api/hooks.ts`
- `src/components/messaging/InboxView.tsx`
- `src/app/inbox/page.tsx`

### Modified Files
- `src/app/messages/page.tsx` - Integrated InboxView component
- `src/app/sitters/[id]/page.tsx` - Added messaging section
- `src/app/api/sitters/[id]/route.ts` - Added messaging data
- `src/components/ui/BuildHash.tsx` - Enhanced with build time + owner-only
- `src/components/providers.tsx` - Added QueryClientProvider

## Dependencies Added
- `@tanstack/react-query` - For React Query hooks
- `date-fns` - For date formatting (formatDistanceToNow)

## Unchanged (As Required)
- ✅ `/dashboard` - No changes to dashboard UI
- ✅ Side navigation - Unchanged
- ✅ Existing routes (`/bookings`, `/clients`, `/payments`, `/payroll`, etc.) - All unchanged
- ✅ Layout structure - AppShell, PageShell, TopBar, SideNav all unchanged
- ✅ Templates tab in `/messages` - Functionality preserved

## How to Enable on Staging

1. **Set environment variable:**
   ```bash
   ENABLE_MESSAGING_V1=true
   ```

2. **Set API URL:**
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api-url.onrender.com
   ```

3. **Restart Render service**

4. **Verify build stamp:**
   - Set `NEXT_PUBLIC_SHOW_BUILD_HASH=true`
   - Set `NEXT_PUBLIC_BUILD_HASH={commit-sha}`
   - Set `NEXT_PUBLIC_BUILD_TIME={build-timestamp}`
   - Build stamp will appear in bottom-right corner (owner-only)

## Testing Checklist

- [ ] `/dashboard` looks identical to pre-messaging version
- [ ] `/messages` shows new inbox when `ENABLE_MESSAGING_V1=true`
- [ ] `/messages` shows disabled message when `ENABLE_MESSAGING_V1=false`
- [ ] `/sitters/[id]` shows messaging section with masked number
- [ ] "Open Inbox" button from sitters page deep-links correctly
- [ ] `/inbox` redirects to `/messages`
- [ ] Build stamp visible to owners only
- [ ] Templates tab still works
- [ ] All other routes unchanged
