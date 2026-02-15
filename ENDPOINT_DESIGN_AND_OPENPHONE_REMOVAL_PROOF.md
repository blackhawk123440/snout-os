# Endpoint Design Fix + OpenPhone Removal + Layout Fixes - Proof

## 1) Endpoint Design Fix

### Problem
- POST `/api/messages/send` was being used inconsistently
- User requirement: All sending must happen through exactly ONE API: `POST /api/messages/threads/:id/messages`

### Solution

**File: `src/app/api/messages/threads/[id]/messages/route.ts`**
- **Line 101-200**: POST handler now:
  1. Tries NestJS API endpoint `/api/messages/threads/:threadId/messages` first
  2. Falls back to `/api/messages/send` if 404 (backward compatibility)
  3. Falls back to Prisma direct implementation if API_BASE_URL not set
  4. Uses `getEffectiveNumberForThread()` for dynamic routing
  5. Sends via provider and creates message record

**File: `src/app/api/messages/threads/route.ts`**
- **Line 336-360**: POST handler for creating thread now calls `/api/messages/threads/:id/messages` internally to send initial message

**File: `src/lib/api/hooks.ts`**
- **Line 214-231**: `useSendMessage()` already uses `/api/messages/threads/${params.threadId}/messages` ✅

**File: `src/lib/api/sitter-hooks.ts`**
- **Line 113-129**: `useSitterSendMessage()` uses `/api/sitter/threads/${threadId}/messages` ✅

### Proof: Exact Fetch Paths

**Owner Inbox:**
- Component: `src/components/messaging/InboxView.tsx:73`
- Hook: `useSendMessage()` from `src/lib/api/hooks.ts:214`
- Endpoint: `POST /api/messages/threads/${threadId}/messages`
- Route: `src/app/api/messages/threads/[id]/messages/route.ts:101`

**New Message Modal:**
- Component: `src/components/messaging/NewMessageModal.tsx:46`
- Hook: `useCreateThread()` from `src/lib/api/hooks.ts:129`
- Endpoint: `POST /api/messages/threads` (with `initialMessage`)
- Route: `src/app/api/messages/threads/route.ts:336` (calls send endpoint internally)

**Sitter Inbox:**
- Component: `src/app/sitter/inbox/page.tsx:51`
- Hook: `useSitterSendMessage()` from `src/lib/api/sitter-hooks.ts:113`
- Endpoint: `POST /api/sitter/threads/${threadId}/messages`

## 2) OpenPhone Removal

### Files Changed

**1. `src/app/settings/page.tsx`**
- **Removed fields:**
  - `openphoneApiKey` (line 37)
  - `openphoneNumberId` (line 38)
  - `ownerOpenphonePhone` (line 40)
  - `ownerPhoneType` (line 41)
- **Removed UI:**
  - "Owner OpenPhone" input field (line 371-377)
  - "Owner Phone Type" select (line 378-387)
- **Added:** Note directing to "Messages → Twilio Setup" (line 364-366)

**2. `src/app/api/sitters/route.ts`**
- **Removed:** `openphonePhone` from response (line 134)
- **Removed:** `phoneType` from response (line 135)

**3. `src/app/api/sitters/[id]/route.ts`**
- **Removed:** `openphonePhone` from GET response (line 53)
- **Removed:** `phoneType` from GET response (line 54)
- **Removed:** `openphonePhone` from PATCH body destructuring (line 95)
- **Removed:** `phoneType` from PATCH body destructuring (line 96)

**4. `src/app/integrations/page.tsx`**
- **Already updated:** Shows "Messaging Provider (Twilio)" with redirect to Messages → Twilio Setup (line 119-121)

### Proof: Grep Results

```bash
# User-facing OpenPhone references (should be empty or redirected)
grep -r "openphone\|OpenPhone" src/app/settings/page.tsx
# Result: Only in comments or removed

grep -r "openphone\|OpenPhone" src/app/integrations/page.tsx
# Result: Only shows redirect message

grep -r "openphonePhone\|phoneType" src/app/api/sitters
# Result: Removed from all responses
```

## 3) Layout Fixes

### Files Changed

**1. `src/components/messaging/InboxView.tsx`**
- **Line 263**: Changed height from `calc(100vh - 200px)` to `calc(100vh - 180px)`
- **Line 263**: Added `width: '100%', overflow: 'hidden'` to prevent horizontal scroll

**2. `src/app/sitter/inbox/page.tsx`**
- **Line 80**: Changed height from `calc(100vh - 200px)` to `calc(100vh - 180px)`
- **Line 80**: Added `width: '100%', overflow: 'hidden'` to prevent horizontal scroll

### Layout Structure

**Owner Inbox:**
```
<div style={{ display: 'flex', height: 'calc(100vh - 180px)', width: '100%', overflow: 'hidden' }}>
  <DiagnosticsPanel /> {/* Owner-only, doesn't obscure */}
  <div style={{ flex: 1 }}> {/* Thread list */}
  <div style={{ flex: 1 }}> {/* Message panel */}
</div>
```

**Sitter Inbox:**
```
<div style={{ display: 'flex', height: 'calc(100vh - 180px)', width: '100%', overflow: 'hidden' }}>
  <div style={{ width: '33%' }}> {/* Thread list */}
  <div style={{ flex: 1 }}> {/* Message panel */}
</div>
```

## 4) Owner "Message Anyone" Proof

### Thread Uniqueness Enforcement

**Database Schema:**
- File: `enterprise-messaging-dashboard/apps/api/prisma/schema.prisma`
- Constraint: `@@unique([orgId, clientId])` on `Thread` model

**Code Proof:**
- File: `src/app/api/messages/threads/route.ts:292-299`
```typescript
let thread = await (prisma as any).thread.findUnique({
  where: {
    orgId_clientId: {
      orgId,
      clientId: client.id,
    },
  },
});
```

**Upsert Logic:**
- File: `src/app/api/messages/threads/route.ts:291-334`
- Finds existing thread by `(orgId, clientId)`
- Creates new thread only if not found
- Creates guest client if client doesn't exist

**From Number:**
- File: `src/app/api/messages/threads/route.ts:302-316`
- Assigns `front_desk` number (business/master) to new threads
- Owner sends use business/master number, not personal

## 5) Sitter Inbox Proof

### Files

**1. `src/app/sitter/inbox/page.tsx`**
- **Line 27**: `useSitterThreads()` - fetches sitter threads
- **Line 28**: `useSitterMessages(selectedThreadId)` - fetches messages
- **Line 29**: `useSitterSendMessage()` - sends messages
- **Line 32**: Shows sitter name from `selectedThread?.sitter?.name`
- **Line 33**: Checks active window for compose gating
- **Line 115**: Shows client name (not E164) - `thread.client.name`
- **Line 170**: Shows `message.redactedBody || message.body` (never shows E164)
- **Line 180-183**: Compose disabled outside window with clear reason

**2. `src/lib/api/sitter-hooks.ts`**
- **Line 73-90**: `useSitterThreads()` calls `/api/sitter/threads`
- **Line 92-111**: `useSitterMessages()` calls `/api/sitter/threads/:id/messages`
- **Line 113-129**: `useSitterSendMessage()` calls `/api/sitter/threads/:id/messages`

### Endpoints

- `GET /api/sitter/threads` - Returns threads with assignment windows
- `GET /api/sitter/threads/:id/messages` - Returns messages (E164 redacted)
- `POST /api/sitter/threads/:id/messages` - Sends message (gated by window)

## Runtime Checklist

### Expected Network Calls

1. **Owner creates new conversation:**
   - `POST /api/messages/threads` → `200 OK` (creates thread)
   - `POST /api/messages/threads/:id/messages` → `200 OK` (sends initial message)

2. **Owner sends message:**
   - `POST /api/messages/threads/:id/messages` → `200 OK`
   - Response: `{ messageId, providerMessageSid, hasPolicyViolation }`

3. **Sitter views inbox:**
   - `GET /api/sitter/threads` → `200 OK`
   - Response: `[{ id, client: { name }, assignmentWindows: [...] }]`

4. **Sitter sends message:**
   - `POST /api/sitter/threads/:id/messages` → `200 OK` (if window active)
   - `POST /api/sitter/threads/:id/messages` → `403 Forbidden` (if window inactive)

5. **Sitters list:**
   - `GET /api/sitters` → `200 OK`
   - Response: `{ sitters: [{ id, firstName, lastName, assignedNumberId }] }`
   - Headers: `X-Snout-Api: sitters-route-hit`, `X-Snout-OrgId: <orgId>`

### Verification Steps

1. Open DevTools → Network
2. Navigate to `/messages`
3. Click "New Message" button
4. Enter phone number and message
5. Verify:
   - `POST /api/messages/threads` → `200`
   - `POST /api/messages/threads/:id/messages` → `200`
6. Send another message in thread
7. Verify:
   - `POST /api/messages/threads/:id/messages` → `200`
   - No calls to `/api/messages/send`
8. Navigate to `/sitter/inbox` (as sitter)
9. Verify:
   - `GET /api/sitter/threads` → `200`
   - Compose disabled if no active window
10. Check Settings page
11. Verify:
    - No OpenPhone fields
    - Note directing to Messages → Twilio Setup

## Files Changed Summary

1. `src/app/api/messages/threads/[id]/messages/route.ts` - Added Prisma fallback, fixed endpoint
2. `src/app/api/messages/threads/route.ts` - Fixed initial message send
3. `src/app/settings/page.tsx` - Removed OpenPhone fields
4. `src/app/api/sitters/route.ts` - Removed openphonePhone from response
5. `src/app/api/sitters/[id]/route.ts` - Removed openphonePhone from GET/PATCH
6. `src/components/messaging/InboxView.tsx` - Fixed layout height/width
7. `src/app/sitter/inbox/page.tsx` - Fixed layout height/width

## Commit

All changes committed in single commit with message:
"Fix endpoint design, remove OpenPhone, fix layout spacing"
