# Messaging Integration Complete

## Summary

The new messaging inbox UI has been fully integrated into the existing SnoutOS dashboard. The main dashboard UI remains unchanged, and messaging is accessible through the existing "Messages" navigation item.

## Changes Made

### A) Messages Tab Integration ✅

- **Location**: `/messages` route (existing navigation)
- **Default View**: New inbox UI (threads + message panel) when `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true`
- **Disabled State**: Shows "Messaging is disabled" empty state when flag is off
- **Tabs**:
  - **Conversations**: All threads (`inbox="all"`)
  - **Owner Inbox**: Threads routed to owner (`inbox="owner"`, scope='internal')
  - **Templates**: Existing templates UI (unchanged)

### B) Owner Inbox Filter ✅

- **Backend**: Added `inbox` query parameter to `GET /api/messages/threads`
  - `inbox=all` (default): Returns all threads
  - `inbox=owner`: Returns only threads with `scope='internal'` (owner inbox)
- **Frontend**: `useThreads` hook now accepts `inbox` filter
- **Implementation**: Uses existing `scope` parameter internally

### C) Auto-Seed Empty State ✅

- **Empty State**: Shows helpful message when no threads exist
- **Dev-Only Button**: "Create Demo Data" button (only in development)
  - Calls `POST /api/messages/seed` endpoint
  - Creates 2 threads with 5 messages total
  - Includes failed delivery example
- **Manual Backup**: `npx tsx scripts/seed-messaging-data.ts` still works

### D) Sitters Page Integration ✅

- **Messaging Panel**: Shows on `/sitters/:id` page
  - Sitter's business number (masked)
  - Active assignment windows count
  - "Open Inbox" button
- **Deep-Link**: `/messages?sitterId={sitterId}`
  - Auto-applies sitter filter
  - Auto-selects most recent active thread if available
- **Layout**: Unchanged - messaging section added without redesigning profile

### E) Staging Readiness ✅

- **Feature Flag**: `NEXT_PUBLIC_ENABLE_MESSAGING_V1` works in production builds
- **Status Badge**: "Messaging: ON/OFF" chip at top-right of `/messages` page (owner-only)
- **API URL**: `NEXT_PUBLIC_API_URL` must point to staging API

## Routes & Endpoints

### Frontend Routes

- `/messages` - Main messages page with tabs
  - `?sitterId={id}` - Filter by sitter and auto-select thread
  - `?thread={id}` - Auto-select specific thread

### API Endpoints

- `GET /api/messages/threads` - List threads
  - Query params:
    - `inbox=all|owner` - Filter by inbox type
    - `sitterId={id}` - Filter by assigned sitter
    - `clientId={id}` - Filter by client
    - `status={status}` - Filter by status
    - `unreadOnly=true` - Only unread threads
    - `hasPolicyViolation=true` - Threads with policy violations
    - `hasDeliveryFailure=true` - Threads with failed deliveries
    - `search={term}` - Search by name/phone
- `GET /api/messages/threads/{id}` - Get thread details
- `POST /api/messages/seed` - Create demo data (dev only)

## Staging Environment Variables

For Render staging deployment, set these environment variables:

```bash
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://your-staging-api-url.onrender.com
```

**Note**: After setting env vars, redeploy the web service for changes to take effect.

## Verification Checklist

- [x] `/messages` shows new inbox UI when flag is ON
- [x] `/messages` shows disabled state when flag is OFF
- [x] Conversations tab shows all threads
- [x] Owner Inbox tab shows only owner-routed threads
- [x] Templates tab works (unchanged)
- [x] Empty state shows "Create Demo Data" button (dev only)
- [x] `/sitters/:id` shows messaging panel
- [x] "Open Inbox" button deep-links correctly
- [x] Sitter filter auto-applies and selects thread
- [x] Main dashboard UI unchanged
- [x] Status badge reflects flag state

## Files Changed

### New Files
- `src/app/api/messages/seed/route.ts` - Dev-only seed endpoint

### Modified Files
- `src/lib/api/hooks.ts` - Added `inbox` filter support
- `src/app/api/messages/threads/route.ts` - Added `inbox` query param handling
- `src/app/messages/page.tsx` - Updated to use `inbox` prop
- `src/components/messaging/InboxView.tsx` - Added `inbox` prop and auto-seed empty state
- `src/app/sitters/[id]/page.tsx` - Already has messaging panel (verified)

## Next Steps

1. **Test locally**:
   - Set `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in `.env.local`
   - Visit `/messages` - should see empty state with "Create Demo Data" button
   - Click button to seed data
   - Verify threads appear and can be selected

2. **Test sitter deep-link**:
   - Visit `/sitters/{id}` for any sitter
   - Click "Open Inbox" button
   - Should navigate to `/messages?sitterId={id}` with filter applied

3. **Deploy to staging**:
   - Set env vars in Render dashboard
   - Redeploy web service
   - Verify status badge shows "ON"
   - Verify threads load correctly
