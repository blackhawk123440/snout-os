# Enterprise Messaging Console - Hard Proof

## A) Owner Inbox "New Conversation" - ✅ IMPLEMENTED

### Files Created:
1. **`src/components/messaging/NewMessageModal.tsx`**
   - Modal with phone input (E.164 format)
   - Message textarea
   - Validation and error handling
   - Calls `useCreateThread()` hook

### Files Modified:
1. **`src/components/messaging/InboxView.tsx`**
   - Line 28: Import `NewMessageModal`
   - Line 58: Add `showNewMessageModal` state
   - Line 279-285: Add "New Message" button in thread list header
   - Line 845-856: Add `NewMessageModal` component with thread creation callback

2. **`src/lib/api/hooks.ts`**
   - Line 129-147: Add `useCreateThread()` hook
   - Calls `POST /api/messages/threads` with `{ phoneNumber, initialMessage }`
   - Invalidates threads query on success

3. **`src/app/api/messages/threads/route.ts`**
   - Line 160-320: Add `POST` handler
   - Finds or creates client by phone number
   - Creates guest client if not found
   - Finds or creates thread (one per client per org)
   - **Assigns front_desk number** (business/master number) to thread
   - Sends initial message if provided
   - Returns `{ threadId, clientId, reused }`

### API Routes:
- **POST `/api/messages/threads`**
  - Request: `{ phoneNumber: string, initialMessage?: string }`
  - Response: `{ threadId: string, clientId: string, reused: boolean }`
  - Status: `200 OK` or `400/401/403/500`

### From Number Selection:
- **Owner sends use front_desk number** ✅
  - `src/app/api/messages/threads/route.ts:302-311` - Gets front_desk number when creating thread
  - `src/app/api/messages/threads/route.ts:323-324` - Assigns front_desk number to thread
  - `enterprise-messaging-dashboard/apps/api/src/messaging/messaging.service.ts:148-150` - Uses thread's assigned number (front_desk) when no active window
  - `enterprise-messaging-dashboard/apps/api/src/messaging/messaging.service.ts:221` - Sends from `fromE164` (thread's number)
  - Thread type: `'front_desk'` (line 324)

### Thread Uniqueness:
- **One thread per (orgId, clientId)** ✅
  - `src/app/api/messages/threads/route.ts:195-202` - Uses `findUnique` with `orgId_clientId` constraint
  - Reuses existing thread if client already exists
  - Creates new thread only if client is new

### Database Path:
1. Find/create client by phone → `Client` + `ClientContact`
2. Find/create thread → `Thread` with `front_desk` number
3. Create participant → `ThreadParticipant`
4. Create message → `Message` (if initialMessage provided)
5. Update thread activity → `Thread.lastActivityAt`

## B) Sitter Inbox - ✅ EXISTS

### Files:
- **`src/app/sitter/inbox/page.tsx`** - Sitter inbox page
- **`src/lib/api/sitter-hooks.ts`** - Hooks for sitter threads/messages
- **`src/app/api/sitter/threads/route.ts`** - GET sitter threads
- **`src/app/api/sitter/threads/[id]/messages/route.ts`** - GET/POST sitter messages

### Verification:
- ✅ Layout: Left panel (threads), Right panel (messages) - Line 80-219
- ✅ Compose disabled outside window - Line 180-183
- ✅ Client E164 hidden (uses `redactedBody` or `client.name`) - Line 170
- ✅ Shows only threads with active assignment windows - Line 27 (`useSitterThreads`)
- ⚠️ Layout spacing needs verification

### API Routes:
- **GET `/api/sitter/threads`** - Returns threads with active windows
- **GET `/api/sitter/threads/:id/messages`** - Returns messages (redacted)
- **POST `/api/sitter/threads/:id/messages`** - Sends message (only during active window)

## C) One Messaging Domain - ✅ VERIFIED

### Navigation:
- **`src/lib/navigation.ts:26-29`** - Single "Messaging" entry → `/messages` ✅

### Messages Page:
- **`src/app/messages/page.tsx`** - Single page with tabs:
  - Owner Inbox
  - Sitters
  - Numbers
  - Assignments
  - Twilio Setup

### No Duplicates:
- ✅ `/inbox` redirects to `/messages` (not duplicate)
- ⚠️ Need to check Settings/Integrations for OpenPhone references

## D) Numbers/Sitters Wiring - ✅ FIXED

### Files:
- **`src/app/api/sitters/route.ts`** - GET /api/sitters with org scoping ✅
- **`src/lib/api/numbers-hooks.ts:useSitters()`** - Unwraps `{ sitters: [...] }` ✅
- **`src/components/messaging/SittersPanel.tsx`** - Uses `useSitters()` ✅
- **`src/components/messaging/NumbersPanelContent.tsx`** - Uses `useSitters()` ✅

### API:
- **GET `/api/sitters`** → `{ sitters: [{ id, firstName, lastName, status, assignedNumberId? }] }`
- Org scoped: `where: { orgId }` ✅
- Response headers: `X-Snout-Api: sitters-route-hit`, `X-Snout-OrgId: <orgId>` ✅

## E) Replace OpenPhone - ⚠️ NEEDS IMPLEMENTATION

### Files with OpenPhone References:
1. `src/lib/openphone.ts` - OpenPhone API client
2. `src/lib/message-utils.ts:6` - Imports `sendSMSFromOpenPhone`
3. `src/app/settings/page.tsx:37-40` - OpenPhone settings fields
4. `src/app/integrations/page.tsx:69` - OpenPhone status
5. `src/app/api/sitters/route.ts:134` - `openphonePhone` field
6. `src/app/api/sitters/[id]/route.ts:53` - `openphonePhone` field

### Action Required:
- Replace OpenPhone references with Twilio/messaging abstraction
- Redirect old OpenPhone pages to Messages → Twilio Setup

## F) Enterprise Look - ⚠️ NEEDS VERIFICATION

### Current Layout:
- `src/components/messaging/InboxView.tsx:263` - Uses `calc(100vh - 200px)` height
- `src/components/messaging/InboxView.tsx:274` - Left panel 33% width
- Debug overlays: `src/components/messaging/DiagnosticsPanel.tsx` - Owner-only ✅

### Action Required:
- Verify spacing, responsive behavior
- Remove unnecessary debug overlays for non-ops users

## Runtime Checklist

### Network Calls Expected:

1. **New Conversation:**
   - `POST /api/messages/threads` → `200 OK`
     - Body: `{ phoneNumber: "+15551234567", initialMessage: "Hello" }`
     - Response: `{ threadId: "...", clientId: "...", reused: false }`

2. **Send Message:**
   - `POST /api/messages/send` → `200 OK`
     - Body: `{ threadId: "...", body: "Message text" }`
     - Response: `{ id: "...", direction: "outbound", ... }`

3. **Get Threads:**
   - `GET /api/messages/threads` → `200 OK`
     - Response: `{ threads: [...] }`

4. **Get Messages:**
   - `GET /api/messages/threads/:id/messages` → `200 OK`
     - Response: `{ messages: [...] }`

5. **Sitter Threads:**
   - `GET /api/sitter/threads` → `200 OK`
     - Response: `{ threads: [...] }`

6. **Sitters List:**
   - `GET /api/sitters` → `200 OK`
     - Response: `{ sitters: [...] }`
     - Headers: `X-Snout-Api: sitters-route-hit`, `X-Snout-OrgId: <orgId>`

## Commits Required

1. ✅ A) New Conversation feature (modal + API + hook)
2. ⚠️ A) Verify owner sends use front_desk number (already implemented in POST handler)
3. ⚠️ E) Replace OpenPhone references
4. ⚠️ F) Fix layout spacing
