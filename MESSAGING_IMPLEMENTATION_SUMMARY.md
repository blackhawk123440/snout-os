# Messaging UI Implementation Summary

## Files Changed

### API Routes (Backend)
1. **`src/app/api/messages/threads/[id]/messages/route.ts`** (NEW)
   - Returns messages for a thread with deliveries and policy violations
   - Uses `prisma.message` model (as fixed by user)
   - Matches Zod schema exactly

2. **`src/app/api/messages/[id]/retry/route.ts`** (NEW)
   - Retries failed message deliveries
   - Creates new `MessageDelivery` record with incremented `attemptNo`
   - Sends via Twilio provider

3. **`src/app/api/routing/threads/[id]/history/route.ts`** (NEW)
   - Returns routing evaluation history
   - Fetches from `auditEvent` table
   - Formats evaluation trace with human-readable steps

4. **`src/app/api/messages/threads/route.ts`**
   - Added filters: `hasPolicyViolation`, `hasDeliveryFailure`, `sitterId`
   - Returns threads with all required nested data (client, sitter, messageNumber, assignmentWindows)

5. **`src/app/api/sitters/[id]/route.ts`**
   - Already includes messaging data (maskedNumber, activeAssignmentWindowsCount)
   - No changes needed

### Frontend Components
6. **`src/components/messaging/InboxView.tsx`**
   - Full inbox UI implementation:
     - Left panel: Thread list with search, filters, badges
     - Right panel: Thread view with header, messages, compose box
     - Routing drawer with evaluation trace
     - Policy override dialog
   - Filters explicitly passed to `useThreads` hook
   - Auto-selects most recent thread when sitter filter applied

7. **`src/app/messages/page.tsx`**
   - Wrapped with Suspense for `useSearchParams`
   - Passes `sitterId` from URL to `InboxView`
   - Maintains existing Templates tab

8. **`src/app/sitters/[id]/page.tsx`**
   - Already has Messaging panel with "Open Inbox" button
   - No changes needed

9. **`src/components/messaging/DiagnosticsPanel.tsx`**
   - Fixed label: "User (from session)" instead of "/api/auth/me"
   - Shows API base URL, fetch status, error classification

### Hooks & Client
10. **`src/lib/api/hooks.ts`**
    - Fixed `useMessages` to call `/api/messages/threads/${threadId}/messages`
    - Added visibility check for polling (only when tab visible)
    - Fixed `useSendMessage` to send `{ threadId, text, forceSend }` format
    - `useThreads` polling respects tab visibility

11. **`src/lib/api/client.ts`**
    - Already tracks fetch metadata in `window.__lastThreadsFetch`
    - No changes needed

## What to Verify in Browser

### Step 1: Start Services
```bash
# Terminal 1: API
cd apps/api
pnpm dev  # Should start on port 3001

# Terminal 2: Web
cd apps/web
pnpm dev  # Should start on port 3000
```

### Step 2: Login & Navigate
1. Go to `http://localhost:3000/login`
2. Login: `leah2maria@gmail.com` / `Saint214!`
3. Should redirect to `/dashboard`
4. Navigate to `/messages`

### Step 3: Check Network Tab (DevTools → Network)

**Expected API Calls:**
1. `GET /api/messages/threads?inbox=all`
   - Status: 200
   - Response: `{ threads: [...], pagination: {...} }`
   - Check: Each thread has `client.name`, `messageNumber.e164`, `messageNumber.class`, `ownerUnreadCount`

2. `GET /api/messages/threads/{threadId}/messages` (when thread selected)
   - Status: 200
   - Response: `Message[]`
   - Check: Each message has `deliveries[]`, `policyViolations[]`, `hasPolicyViolation`

3. `GET /api/routing/threads/{threadId}/history` (when "Why routed here?" clicked)
   - Status: 200
   - Response: `{ events: [{ decision: {...}, timestamp: string }] }`

### Step 4: Visual Verification

**Left Panel:**
- [ ] Search box visible
- [ ] Filter buttons: "Unread", "Policy Issues", "Delivery Failures"
- [ ] Thread rows show:
  - [ ] Client name (or "Unknown")
  - [ ] Number class badge (front_desk/pool/sitter)
  - [ ] Business number
  - [ ] Unread badge (if > 0)
  - [ ] Last activity time

**Right Panel (when thread selected):**
- [ ] Header shows client name, business number, assigned sitter, window status
- [ ] "Why routed here?" button visible
- [ ] Messages list shows:
  - [ ] Sender labels (Client/Owner/System)
  - [ ] Timestamps
  - [ ] Delivery status badges
  - [ ] Retry button on failed messages
  - [ ] Policy violation banners
- [ ] Compose box visible (only when thread selected)

**Filters:**
- [ ] Click "Unread" → filters threads
- [ ] Click "Policy Issues" → filters threads
- [ ] Click "Delivery Failures" → filters threads
- [ ] Type in search → filters threads

**Polling:**
- [ ] Threads refresh every ~5s (check Network tab)
- [ ] Messages refresh every ~3s (check Network tab)
- [ ] Polling stops when tab hidden (switch tabs, check Network tab)

**Send Message:**
- [ ] Type message and send
- [ ] Message appears immediately
- [ ] Delivery status updates

**Retry:**
- [ ] Click "Retry" on failed message
- [ ] Button shows "Retrying..." state
- [ ] New delivery attempt created

**Routing Drawer:**
- [ ] Click "Why routed here?"
- [ ] Drawer opens
- [ ] Shows final decision and evaluation trace

### Step 5: Sitter Deep-Link
1. Go to `/sitters/{any-sitter-id}`
2. Click "Open Inbox" button
3. Should navigate to `/messages?sitterId={id}`
4. Threads should be filtered to that sitter
5. Most recent thread should be auto-selected

### Step 6: Diagnostics Panel
- [ ] Bottom-right corner (owner-only)
- [ ] Shows API base URL
- [ ] Shows last fetch URL + status
- [ ] Shows user email + role
- [ ] Error classification visible

## Commands to Seed Data

If threads are empty:

```bash
# Option 1: Use UI button (dev-only)
# Click "Create Demo Data" button in empty state

# Option 2: Run script
cd apps/api
npx tsx ../../scripts/seed-messaging-data.ts
```

## Environment Variables

**Local (`apps/web/.env.local`):**
```
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Staging (Render Web):**
```
NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
NEXT_PUBLIC_API_URL=https://<staging-api-url>
NEXTAUTH_URL=https://snout-os-staging.onrender.com
NEXTAUTH_SECRET=<64+ char secret>
```

**Staging (Render API):**
```
ENABLE_MESSAGING_V1=true
DATABASE_URL=<postgres-url>
REDIS_URL=<redis-url>
JWT_SECRET=<secret>
ENCRYPTION_KEY=<key>
```

## Known Issues & Fixes

1. **"No threads appearing"**
   - Check: Network tab → `/api/messages/threads` status
   - If 401: JWT token issue
   - If 404: `ENABLE_MESSAGING_V1` not set
   - If 200 with empty array: Run seed script

2. **"Messages not loading"**
   - Check: Network tab → `/api/messages/threads/{id}/messages` status
   - If 500: Check server logs for Prisma errors
   - Verify `prisma.message` model exists in schema

3. **"Filters not working"**
   - Check: Network tab → Query params in URL
   - Verify: `unreadOnly=true`, `hasPolicyViolation=true`, etc. are present

4. **"Retry button not working"**
   - Check: Network tab → `POST /api/messages/{id}/retry` status
   - If 404: Route doesn't exist (should be fixed now)
   - If 500: Check server logs

## Feature Verification Checklist

- [ ] `/dashboard` unchanged (verify visually)
- [ ] `/messages` shows threads with real data
- [ ] Thread selection loads messages
- [ ] Send message works
- [ ] Retry button works and updates UI
- [ ] Policy Issues filter works
- [ ] Delivery Failures filter works
- [ ] Routing drawer shows trace
- [ ] Sitters deep-link filters & selects thread
- [ ] Polling works (5s threads, 3s messages)
- [ ] Polling stops when tab hidden
- [ ] Diagnostics panel shows correct info
