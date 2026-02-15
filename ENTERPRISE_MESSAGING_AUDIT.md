# Enterprise Messaging Console - Hard Proof Audit

## Current State Analysis

### A) Owner Inbox "New Conversation" - ❌ MISSING

**What exists:**
- `src/components/messaging/InboxView.tsx` - Owner inbox component
- `src/app/api/messages/threads/route.ts` - GET endpoint (list threads)
- `src/app/api/messages/send/route.ts` - POST endpoint (send message to existing thread)

**What's missing:**
1. ❌ "New Conversation" button in InboxView
2. ❌ NewMessageModal component
3. ❌ POST `/api/messages/threads` endpoint (create thread by phone)
4. ❌ Logic to find/create thread by phone number
5. ❌ Logic to assign business/master number (front_desk) for owner sends

**Current thread creation:**
- `src/lib/bookings/booking-confirmed-handler.ts:findOrCreateThread()` - Creates thread on booking confirmation
- `enterprise-messaging-dashboard/apps/api/src/webhooks/webhooks.service.ts:resolveThreadForInbound()` - Creates thread on inbound message
- **NO endpoint for owner-initiated thread creation**

**From number selection:**
- `src/lib/messaging/dynamic-number-routing.ts:getEffectiveNumberForThread()` - Routes based on active windows
- `enterprise-messaging-dashboard/apps/api/src/messaging/messaging.service.ts:sendMessage()` - Uses thread's assigned number
- **NO explicit "business/master number" assignment for owner sends**

### B) Sitter Inbox - ✅ EXISTS (needs verification)

**What exists:**
- `src/app/sitter/inbox/page.tsx` - Sitter inbox page
- `src/lib/api/sitter-hooks.ts` - Hooks for sitter threads/messages
- `src/app/api/sitter/threads/route.ts` - GET sitter threads
- `src/app/api/sitter/threads/[id]/messages/route.ts` - GET/POST sitter messages

**Verification needed:**
- ✅ Layout exists (left: threads, right: messages)
- ✅ Compose disabled outside window (line 180-183)
- ✅ Client E164 hidden (uses `redactedBody` or `client.name`)
- ⚠️ Need to verify layout spacing/enterprise look

### C) One Messaging Domain - ⚠️ PARTIAL

**Current navigation:**
- `src/lib/navigation.ts:26-29` - "Messaging" → `/messages` ✅

**What exists:**
- `src/app/messages/page.tsx` - Single page with tabs (Owner Inbox, Sitters, Numbers, Assignments, Twilio Setup) ✅

**Potential duplicates:**
- `src/app/inbox/page.tsx` - Redirects to `/messages` ✅ (not duplicate)
- Need to check: Settings/Integrations for OpenPhone references

### D) Numbers/Sitters Wiring - ✅ FIXED (earlier)

**What exists:**
- `src/app/api/sitters/route.ts` - GET /api/sitters with org scoping ✅
- `src/lib/api/numbers-hooks.ts:useSitters()` - Hook unwraps `{ sitters: [...] }` ✅
- `src/components/messaging/SittersPanel.tsx` - Uses `useSitters()` ✅
- `src/components/messaging/NumbersPanelContent.tsx` - Uses `useSitters()` ✅

### E) Replace OpenPhone - ❌ NOT DONE

**OpenPhone references found:**
- `src/lib/openphone.ts` - OpenPhone API client
- `src/lib/message-utils.ts:6` - Imports `sendSMSFromOpenPhone`
- `src/app/settings/page.tsx:37-40` - OpenPhone settings fields
- `src/app/integrations/page.tsx:69` - OpenPhone status
- `src/app/api/sitters/route.ts:134` - `openphonePhone` field
- `src/app/api/sitters/[id]/route.ts:53` - `openphonePhone` field

**Action needed:**
- Replace OpenPhone references with Twilio/messaging abstraction
- Redirect old OpenPhone pages to Messages → Twilio Setup

### F) Enterprise Look - ⚠️ NEEDS VERIFICATION

**Current layout:**
- `src/components/messaging/InboxView.tsx:261` - Uses `calc(100vh - 200px)` height
- `src/components/messaging/InboxView.tsx:274` - Left panel 33% width
- Need to verify spacing, responsive behavior

**Debug overlays:**
- `src/components/messaging/DiagnosticsPanel.tsx` - Owner-only diagnostics ✅

## Implementation Plan

### Priority 1: A) New Conversation Feature

**Files to create:**
1. `src/components/messaging/NewMessageModal.tsx` - Modal with phone input
2. `src/app/api/messages/threads/route.ts` - Add POST handler (create by phone)

**Files to modify:**
1. `src/components/messaging/InboxView.tsx` - Add "New Conversation" button
2. `src/lib/api/hooks.ts` - Add `useCreateThread()` hook
3. `src/app/api/messages/send/route.ts` - Ensure uses front_desk number for owner sends

### Priority 2: E) Replace OpenPhone

**Files to modify:**
1. `src/app/settings/page.tsx` - Remove OpenPhone fields, redirect to Messages → Twilio Setup
2. `src/app/integrations/page.tsx` - Remove OpenPhone status, redirect
3. `src/lib/message-utils.ts` - Replace with Twilio provider
4. `src/app/api/sitters/route.ts` - Remove `openphonePhone` field

### Priority 3: F) Enterprise Look

**Files to modify:**
1. `src/components/messaging/InboxView.tsx` - Fix spacing, responsive layout
2. `src/app/sitter/inbox/page.tsx` - Verify layout, fix if needed
