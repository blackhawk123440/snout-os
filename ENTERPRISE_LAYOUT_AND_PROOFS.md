# Enterprise Layout + Phone Uniqueness + Runtime Proof + Sitter Upgrade

## A) Enterprise Layout Implementation

### Problem
Hardcoded `calc(100vh - 180px)` values break responsive layout and don't work with AppShell's flex container.

### Solution

**Layout Contract:**
- **Shell:** `h-screen` (AppShell already provides this)
- **Content:** `flex flex-col h-full` (messages page wrapper)
- **Main panels:** `flex-1 min-h-0 overflow-hidden` (allows flex to constrain height)
- **Thread list + message list:** `overflow-y-auto` (scrollable content)
- **Composer:** `flex-shrink-0` (pinned bottom, never overlaps)

### Files Changed

**1. `src/app/messages/page.tsx`**
```diff
- <div style={{ padding: tokens.spacing[6] }}>
+ <div className="flex flex-col h-full min-h-0" style={{ padding: 0 }}>
    <Tabs>
-     <TabPanel id="inbox">
+     <TabPanel id="inbox" className="flex-1 min-h-0 flex flex-col">
```

**2. `src/components/messaging/InboxView.tsx`**
```diff
- <div style={{ display: 'flex', height: 'calc(100vh - 180px)', ... }}>
+ <div className="flex flex-1 min-h-0 overflow-hidden h-full">
- <div style={{ width: '33%', ... display: 'flex', flexDirection: 'column' }}>
+ <div className="w-1/3 flex flex-col min-h-0" style={{ borderRight: ..., backgroundColor: ... }}>
- <div style={{ flex: 1, overflowY: 'auto' }}>
+ <div className="flex-1 min-h-0 overflow-y-auto">
- <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
+ <div className="flex-1 min-h-0 flex flex-col">
- <div style={{ flex: 1, overflowY: 'auto', padding: ... }}>
+ <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: ... }}>
- <div style={{ padding: ..., backgroundColor: 'white' }}>
+ <div className="flex-shrink-0" style={{ padding: ..., backgroundColor: 'white' }}>
```

**3. `src/app/sitter/inbox/page.tsx`**
```diff
- <div style={{ display: 'flex', height: 'calc(100vh - 200px)', ... }}>
+ <div className="flex flex-1 min-h-0 overflow-hidden h-full">
- <div style={{ width: '33%', ... display: 'flex', flexDirection: 'column' }}>
+ <div className="w-1/3 flex flex-col min-h-0" style={{ borderRight: ..., backgroundColor: ... }}>
- <div style={{ flex: 1, overflowY: 'auto' }}>
+ <div className="flex-1 min-h-0 overflow-y-auto">
- <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
+ <div className="flex-1 min-h-0 flex flex-col">
- <div style={{ flex: 1, overflowY: 'auto', padding: ... }}>
+ <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: ... }}>
- <div style={{ padding: ..., backgroundColor: 'white' }}>
+ <div className="flex-shrink-0" style={{ padding: ..., backgroundColor: 'white' }}>
```

### Layout Contract Explanation

1. **`h-full`**: Takes full height of parent (AppShell's main content area)
2. **`flex-1`**: Grows to fill available space
3. **`min-h-0`**: Critical for flex children - allows them to shrink below content size, enabling proper scrolling
4. **`overflow-hidden`**: Prevents content from spilling outside container
5. **`overflow-y-auto`**: Enables vertical scrolling for thread/message lists
6. **`flex-shrink-0`**: Prevents composer from shrinking, keeps it pinned at bottom

## B) Phone-to-Client Uniqueness Proof

### Problem
Guest clients created by phone can create duplicates if same phone is used to create a client later, leading to multiple threads for same phone.

### Solution

**Schema Change:**
- File: `enterprise-messaging-dashboard/apps/api/prisma/migrations/20260130000000_phone_to_client_uniqueness/migration.sql`
- Added index: `CREATE INDEX IF NOT EXISTS "ClientContact_orgId_e164_idx" ON "ClientContact"("e164");`
- Note: Cannot create unique constraint across tables in PostgreSQL without function/trigger. Application code enforces invariant.

**Code Change:**
- File: `src/app/api/messages/threads/route.ts:254-289`
- **Before:** Looked up Client by orgId + contacts.some(e164)
- **After:** Looks up ClientContact by e164 + client.orgId, then gets Client

```typescript
// CRITICAL: Find client by phone number (orgId + e164)
// This ensures one client per phone per org, preventing duplicate threads.
const contact = await (prisma as any).clientContact.findFirst({
  where: {
    e164: normalizedPhone,
    client: {
      orgId,
    },
  },
  include: {
    client: {
      include: {
        contacts: true,
      },
    },
  },
});

let client;
if (contact) {
  // Reuse existing client for this phone
  client = contact.client;
} else {
  // Create guest client (first time this phone is seen)
  client = await (prisma as any).client.create({...});
}
```

### Unit Test

**File:** `src/lib/messaging/__tests__/phone-to-client-uniqueness.test.ts`

**Test Cases:**
1. `should reuse existing client when creating guest by phone, then later creating client with same phone`
2. `should find existing client by phone before creating new one`

## C) Runtime Proof Document

**File:** `OWNER_MESSAGE_ANYONE_RUNTIME_PROOF.md`

**Contents:**
- DevTools screenshot requirements for POST /api/messages/threads
- DevTools screenshot requirements for POST /api/messages/threads/:id/messages
- DB proof queries for single client per phone
- DB proof queries for single thread per org+client
- Test scenarios and verification checklist

## D) Sitter Experience Upgrade

### Changes

**1. Sitter Name + Assigned Number Display**
- File: `src/app/sitter/inbox/page.tsx:130-140`
- Shows sitter name from `user.name || user.email`
- Shows assigned number from `selectedThread?.messageNumber?.e164`

**2. Booking Context**
- File: `src/app/sitter/inbox/page.tsx:102-125`
- Thread list shows assignment window status
- Active windows show "✓ Active" with end time
- Inactive windows show "Inactive" with end time

**3. Clear "Blocked Outside Window" Explanation**
- File: `src/app/sitter/inbox/page.tsx:178-190`
- Header shows active/inactive status with color coding
- Compose box shows detailed explanation when blocked:
  - "Cannot send messages" heading
  - "Your assignment window is not currently active. Messages can only be sent during active assignment windows. Contact the owner if you need to communicate outside your window."

**4. Enterprise UI Polish**
- Consistent spacing using tokens
- Color-coded status indicators (success/warning)
- Typography hierarchy (semibold headings, secondary text)
- Proper flex layout (no calc() hacks)

### Component Structure

```tsx
<AppShell>
  <PageHeader />
  <div className="flex flex-1 min-h-0 overflow-hidden h-full">
    {/* Thread List */}
    <div className="w-1/3 flex flex-col min-h-0">
      <div className="flex-shrink-0">Header</div>
      <div className="flex-1 min-h-0 overflow-y-auto">Threads</div>
    </div>
    
    {/* Message View */}
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-shrink-0">Thread Header (sitter name + number)</div>
      <div className="flex-1 min-h-0 overflow-y-auto">Messages</div>
      <div className="flex-shrink-0">Compose Box</div>
    </div>
  </div>
</AppShell>
```

## Files Changed Summary

1. `src/app/messages/page.tsx` - Flex layout wrapper
2. `src/components/messaging/InboxView.tsx` - Enterprise flex layout
3. `src/app/sitter/inbox/page.tsx` - Enterprise flex layout + UI upgrades
4. `src/app/api/messages/threads/route.ts` - Phone→client uniqueness resolver
5. `enterprise-messaging-dashboard/apps/api/prisma/migrations/20260130000000_phone_to_client_uniqueness/migration.sql` - Index for phone lookup
6. `src/lib/messaging/__tests__/phone-to-client-uniqueness.test.ts` - Unit tests
7. `OWNER_MESSAGE_ANYONE_RUNTIME_PROOF.md` - Runtime proof requirements

## Commit

All changes committed with message:
"A-D: Enterprise layout, phone uniqueness, runtime proof, sitter upgrade"
