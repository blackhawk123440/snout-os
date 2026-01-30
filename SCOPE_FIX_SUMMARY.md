# Scope/Placement Bug Fix Summary

## Issue
The `/dashboard` route was showing "Messaging Dashboard" content from the `enterprise-messaging-dashboard` app, which was incorrectly being picked up by Next.js.

## Fixes Applied

### TASK 1 — Reverted /dashboard to Pre-Messaging UI ✅
- **Deleted**: `enterprise-messaging-dashboard/apps/web/src/app/dashboard/page.tsx` (contained "Messaging Dashboard")
- **Verified**: Root route (`/`) at `src/app/page.tsx` shows correct dashboard:
  - Title: "Dashboard"
  - Stats: Active Bookings, Active Sitters, Total Revenue, Active Clients
  - Quick Actions: View Bookings, Manage Clients, Manage Sitters, View Payments
- **No changes** to global layout/nav styling
- **No changes** to Bookings/Clients/Sitters/Payments/Payroll pages

### TASK 2 — Messaging UI in /messages Only ✅
- **Component**: `InboxView` from `src/components/messaging/InboxView.tsx`
- **Location**: `src/app/messages/page.tsx` - "Conversations" tab
- **Features** (when `ENABLE_MESSAGING_V1=true`):
  - Thread list with filters/search
  - Message view with delivery status
  - Compose thread-bound only
  - Retry failed deliveries
  - Policy violation UI + owner override with reason
  - Routing "why" drawer (trace)
  - Polling updates (threads 5s, messages 3s)
- **Templates tab**: Preserved and working correctly
- **Feature flag**: Shows "Messaging is disabled" when `ENABLE_MESSAGING_V1=false`

### TASK 3 — Sitters Page Integration ✅
- **File**: `src/app/sitters/[id]/page.tsx`
- **Added**: "Messaging" section showing:
  - Status (Active/Inactive)
  - Business Number (masked number or "Not assigned")
  - Active Assignment Windows count
  - "Open Inbox" button
- **Deep-link format**: `/messages?sitterId={sitterId}`
- **Layout**: Unchanged - messaging section added without redesigning profile page

### TASK 4 — Route Compatibility ✅
- **File**: `src/app/inbox/page.tsx`
- **Behavior**: Redirects `/inbox` → `/messages`
- **Navigation**: Uses existing "Messages" nav link (no new top-level items)

### TASK 5 — Feature Flag Gating ✅
- **Behavior**: 
  - `ENABLE_MESSAGING_V1=false`: Shows "Messaging is disabled" empty state
  - `ENABLE_MESSAGING_V1=true`: Shows new inbox UI in `/messages`
- **Implementation**: Checked in `src/app/messages/page.tsx` via `/api/messages/me` endpoint

## Files Changed

### Deleted
- `enterprise-messaging-dashboard/apps/web/src/app/dashboard/page.tsx` (conflicting dashboard page)

### Verified (No Changes Needed)
- `src/app/page.tsx` - Correct dashboard implementation
- `src/app/messages/page.tsx` - Already has InboxView integrated
- `src/app/sitters/[id]/page.tsx` - Already has messaging entrypoints
- `src/app/inbox/page.tsx` - Already redirects to /messages

## Verification

### /dashboard (Root Route `/`)
- ✅ Shows "Dashboard" title (not "Messaging Dashboard")
- ✅ Shows stats: Active Bookings, Active Sitters, Total Revenue, Active Clients
- ✅ Shows Quick Actions: View Bookings, Manage Clients, Manage Sitters, View Payments
- ✅ No messaging content visible

### /messages
- ✅ Shows "Conversations" and "Templates" tabs
- ✅ When `ENABLE_MESSAGING_V1=true`: Shows InboxView in Conversations tab
- ✅ When `ENABLE_MESSAGING_V1=false`: Shows "Messaging is disabled" message
- ✅ Templates tab works correctly

### /sitters/:id
- ✅ Layout unchanged
- ✅ Has "Messaging" section with:
  - Status badge
  - Business number display
  - Active windows count
  - "Open Inbox" button
- ✅ Deep-link: `/messages?sitterId={sitterId}`

### /inbox
- ✅ Redirects to `/messages`

## Component Mapping

- **Root Dashboard (`/`)**: `src/app/page.tsx` → `DashboardHomePage` component
- **Messages Page (`/messages`)**: `src/app/messages/page.tsx` → `InboxView` component (in Conversations tab)
- **Sitters Detail (`/sitters/:id`)**: `src/app/sitters/[id]/page.tsx` → Includes messaging section with deep-link

## Deep-Link Format

From `/sitters/:id` to `/messages`:
```
/messages?sitterId={sitterId}
```

Example: `/messages?sitterId=abc123`

The `InboxView` component reads the `sitterId` query parameter and filters threads accordingly.
