# Messaging UI Verification Checklist

## Prerequisites
1. Start services: `cd apps/api && pnpm dev` (port 3001) and `cd apps/web && pnpm dev` (port 3000)
2. Login as owner: `leah2maria@gmail.com` / `Saint214!`
3. Ensure `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` in `apps/web/.env.local`

## Step 1: Verify /messages Page

### A. Check API Calls (Open Browser DevTools → Network tab)

**Expected API calls:**
1. `GET /api/messages/threads?inbox=all` (or `?scope=internal` for Owner Inbox tab)
   - Status: 200
   - Response shape: `{ threads: Thread[], pagination: {...} }`
   - Each thread should have: `id`, `client.name`, `messageNumber.e164`, `messageNumber.class`, `ownerUnreadCount`, `lastActivityAt`, `sitter`, `assignmentWindows`

2. `GET /api/messages/threads/{threadId}/messages` (when thread selected)
   - Status: 200
   - Response shape: `Message[]`
   - Each message should have: `id`, `direction`, `senderType`, `body`, `deliveries[]`, `policyViolations[]`, `hasPolicyViolation`, `createdAt`

3. `GET /api/routing/threads/{threadId}/history` (when "Why routed here?" clicked)
   - Status: 200
   - Response shape: `{ events: Array<{ decision: RoutingDecision, timestamp: string }> }`

### B. Visual Verification

**Left Panel (Threads List):**
- [ ] Search box is visible and functional
- [ ] Filter buttons: "Unread", "Policy Issues", "Delivery Failures" are visible
- [ ] Thread rows show:
  - [ ] Client name (or "Unknown" if missing)
  - [ ] Number class badge (front_desk/pool/sitter) with correct color
  - [ ] Business number (e164)
  - [ ] Unread count badge (if > 0)
  - [ ] Last activity time ("X minutes ago")
  - [ ] Assigned sitter name (if any)

**Right Panel (Thread View):**
- [ ] Thread header shows:
  - [ ] Client name
  - [ ] Business number with class badge
  - [ ] Assigned sitter (if any)
  - [ ] Window status (Active/Future/Past or "No active window")
  - [ ] "Why routed here?" button
- [ ] Messages list shows:
  - [ ] Sender labels (Client/Owner/System)
  - [ ] Timestamps
  - [ ] Delivery status badges (Sent/Delivered/Failed/Received)
  - [ ] Failed deliveries show error message
  - [ ] Retry button on failed outbound messages
  - [ ] Policy violation banners (if any)
- [ ] Compose box:
  - [ ] Only visible when thread selected
  - [ ] Placeholder: "Type a message..."
  - [ ] Send button (disabled when empty)
  - [ ] Cmd/Ctrl+Enter to send

**Routing Drawer:**
- [ ] Opens when "Why routed here?" clicked
- [ ] Shows final decision (target, reason)
- [ ] Shows evaluation trace steps (rule, condition, result, explanation)

**Tabs:**
- [ ] "Conversations" tab (inbox=all)
- [ ] "Owner Inbox" tab (inbox=owner) - only visible to owners
- [ ] "Templates" tab (existing functionality preserved)

### C. Functional Verification

**Filters:**
- [ ] Click "Unread" → only threads with `ownerUnreadCount > 0` shown
- [ ] Click "Policy Issues" → only threads with policy violations shown
- [ ] Click "Delivery Failures" → only threads with failed deliveries shown
- [ ] Type in search box → filters threads by client name, number, or sitter name

**Polling:**
- [ ] Threads refresh every ~5 seconds (check Network tab)
- [ ] Messages refresh every ~3 seconds when thread selected
- [ ] Polling stops when tab is hidden (switch to another tab, check Network tab)

**Send Message:**
- [ ] Type message and send
- [ ] Message appears immediately (optimistic update)
- [ ] Delivery status updates after send
- [ ] If policy violation, override dialog appears

**Retry:**
- [ ] Click "Retry" on failed message
- [ ] Button shows "Retrying..." state
- [ ] Message delivery status updates after retry

## Step 2: Verify /sitters/[id] Page

### A. Check API Calls

1. `GET /api/sitters/{id}`
   - Status: 200
   - Response includes: `maskedNumber`, `activeAssignmentWindowsCount`

### B. Visual Verification

- [ ] "Messaging" section is visible (without changing page layout)
- [ ] Shows business number (or "Not assigned")
- [ ] Shows active windows count
- [ ] "Open Inbox" button is visible

### C. Deep-Link Verification

- [ ] Click "Open Inbox" button
- [ ] Navigates to `/messages?sitterId={id}`
- [ ] Threads are filtered to that sitter
- [ ] Most recent thread is auto-selected
- [ ] If no threads, shows "No active conversations for this sitter"

## Step 3: Verify Diagnostics Panel

**Location:** Bottom-right corner (owner-only)

**Shows:**
- [ ] `NEXT_PUBLIC_ENABLE_MESSAGING_V1` value
- [ ] `NEXT_PUBLIC_API_URL` value (or "(relative - same origin)")
- [ ] Resolved API base URL
- [ ] User email and role (from session)
- [ ] Last threads fetch: URL, status code, response size
- [ ] Error classification:
  - [ ] 401/403 → "JWT/auth mismatch"
  - [ ] 404 → "Wrong API base URL or route not deployed"
  - [ ] 5xx → "API down"
  - [ ] 200 with 0 threads → "DB empty — seed required"

## Step 4: Verify Feature Flag Behavior

**When `NEXT_PUBLIC_ENABLE_MESSAGING_V1=false`:**
- [ ] Shows "Messaging is disabled" empty state
- [ ] Diagnostics panel still visible (owner-only)

**When `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true`:**
- [ ] Full inbox UI is visible
- [ ] "Messaging: ON" badge visible in header

## Step 5: Seed Data (if needed)

If threads are empty:
1. Click "Create Demo Data" button (dev-only, in empty state)
2. OR run: `cd apps/api && npx tsx ../../scripts/seed-messaging-data.ts`
3. Refresh page
4. Verify threads appear

## Common Issues & Fixes

**Issue: "No threads appearing"**
- Check: Network tab → `/api/messages/threads` → Status code
- If 401: Check JWT token in cookies
- If 404: Check `ENABLE_MESSAGING_V1` env var
- If 200 with empty array: Run seed script

**Issue: "Messages not loading"**
- Check: Network tab → `/api/messages/threads/{id}/messages` → Status code
- If 404: Check if route exists
- If 500: Check server logs for Prisma errors

**Issue: "Filters not working"**
- Check: Network tab → Query params in `/api/messages/threads` URL
- Verify: `unreadOnly=true`, `hasPolicyViolation=true`, `hasDeliveryFailure=true` are present

**Issue: "Polling not stopping when tab hidden"**
- Check: Browser DevTools → Application → Service Workers (if any)
- Verify: `document.hidden` check in `refetchInterval` function

## Files Changed

1. `src/app/api/messages/threads/[id]/messages/route.ts` - Messages endpoint
2. `src/app/api/routing/threads/[id]/history/route.ts` - Routing history endpoint
3. `src/app/api/messages/threads/route.ts` - Added filters (policy violations, delivery failures, sitterId)
4. `src/lib/api/hooks.ts` - Fixed endpoint URLs, added visibility check for polling
5. `src/components/messaging/InboxView.tsx` - Full UI implementation
6. `src/app/messages/page.tsx` - Tab integration, sitterId deep-link
7. `src/app/sitters/[id]/page.tsx` - Messaging panel (already exists)
8. `src/app/api/sitters/[id]/route.ts` - Messaging data (already exists)
9. `src/components/messaging/DiagnosticsPanel.tsx` - Fixed label

## Environment Variables Required

**Local (`apps/web/.env.local`):**
```
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Staging (Render Web service):**
```
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://<staging-api-url>
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<64+ char secret>
```

**Staging (Render API service):**
```
ENABLE_MESSAGING_V1=true
DATABASE_URL=<postgres-url>
REDIS_URL=<redis-url>
JWT_SECRET=<secret>
ENCRYPTION_KEY=<key>
```

## Commands to Seed Data

```bash
# From project root
cd apps/api
npx tsx ../../scripts/seed-messaging-data.ts
```

Or use the "Create Demo Data" button in the UI (dev-only).
