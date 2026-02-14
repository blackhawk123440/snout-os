# Messaging Runtime Proof

**Version:** 1.0  
**Date:** 2026-01-19  
**Purpose:** Runtime verification of all messaging features with screenshots and network proof

---

## Prerequisites

1. **Local Environment Running:**
   - Next.js app: `http://localhost:3000`
   - Database: PostgreSQL (seeded)
   - Owner logged in: `leah2maria@gmail.com` (or your owner account)

2. **Seed Demo Data:**
   - Click "Generate Demo Data" button in `/messages` (Owner Inbox tab)
   - OR run: `tsx scripts/seed-messaging-proof.ts`
   - This creates:
     - 1 unread thread (ownerUnreadCount = 2)
     - 1 thread with failed delivery message
     - 1 thread with policy violation
     - 1 active assignment window
     - 1 quarantined number

---

## Proof Checklist

### ✅ Phase 1-2: Navigation Verification

**Screenshot Required:** Sidebar navigation showing "Messaging" only once (no sub-items)

**Steps:**
1. Login as owner
2. Open sidebar (hamburger menu)
3. Verify "Messaging" appears exactly once
4. Verify no nested "Inbox", "Numbers", "Assignments" under Messaging

**Expected:**
- Single "Messaging" entry in sidebar
- Clicking goes to `/messages`
- Internal tabs visible inside `/messages` page

**Screenshot:** `proof-pack/navigation-sidebar.png`

---

### ✅ Phase 1-2: Messages Page Structure

**Screenshot Required:** `/messages` page showing internal tabs

**Steps:**
1. Navigate to `/messages`
2. Verify tabs visible: "Owner Inbox", "Sitters", "Numbers", "Assignments", "Twilio Setup"
3. Verify no duplicate navigation in sidebar

**Expected:**
- Tabs are internal to `/messages` page
- No duplicate sidebar entries

**Screenshot:** `proof-pack/messages-page-tabs.png`

---

### ✅ Scenario 1: Unread Thread

**Screenshot Required:** Thread list showing unread badge/count

**Steps:**
1. Navigate to `/messages` (Owner Inbox tab)
2. Look for thread with unread indicator (badge or bold text)
3. Click thread to view messages
4. Verify unread count decreases after viewing

**Network Proof:**
```
GET /api/messages/threads?unreadOnly=true
Status: 200
Response: { threads: [{ id: "...", ownerUnreadCount: 2, ... }] }
```

**Screenshot:** `proof-pack/unread-thread-list.png`

---

### ✅ Scenario 2: Failed Delivery + Retry Button

**Screenshot Required:** Message panel showing failed message with "Retry" button

**Steps:**
1. Navigate to `/messages` (Owner Inbox tab)
2. Filter by "Delivery Failures" (or find thread with failed message)
3. Select thread with failed delivery
4. Verify failed message shows:
   - Red "Failed" badge
   - "Retry" button visible
5. Click "Retry" button
6. Verify message retries (check delivery status updates)

**Network Proof:**
```
GET /api/messages/threads?hasDeliveryFailure=true
Status: 200
Response: { threads: [{ id: "...", ... }] }

GET /api/messages/threads/{threadId}/messages
Status: 200
Response: { messages: [{ id: "...", deliveryStatus: "failed", ... }] }

POST /api/messages/{messageId}/retry
Status: 200
Response: { success: true, message: "Retry queued" }
```

**Screenshot:** `proof-pack/failed-delivery-retry.png`

---

### ✅ Scenario 3: Policy Violation Banner

**Screenshot Required:** Message panel showing policy violation banner

**Steps:**
1. Navigate to `/messages` (Owner Inbox tab)
2. Filter by "Policy Issues" (or find thread with policy violation)
3. Select thread with policy violation
4. Verify message shows:
   - Red "Policy violation detected" banner
   - Message body redacted (shows `[REDACTED]` for sensitive data)
5. Verify banner explains what was redacted

**Network Proof:**
```
GET /api/messages/threads?hasPolicyViolation=true
Status: 200
Response: { threads: [{ id: "...", ... }] }

GET /api/messages/threads/{threadId}/messages
Status: 200
Response: { messages: [{ id: "...", hasPolicyViolation: true, redactedBody: "...", ... }] }
```

**Screenshot:** `proof-pack/policy-violation-banner.png`

---

### ✅ Scenario 4: Active Assignment Window

**Screenshot Required:** Thread showing "Active" assignment window indicator

**Steps:**
1. Navigate to `/messages` (Owner Inbox tab)
2. Find thread with active assignment window
3. Verify:
   - Sitter name visible
   - "Active" badge/indicator visible
   - Window dates shown (start/end)
4. Navigate to Assignments tab
5. Verify window appears in assignments list with "Active" status

**Network Proof:**
```
GET /api/messages/threads
Status: 200
Response: { threads: [{ id: "...", assignedSitter: { name: "..." }, assignmentWindows: [{ status: "active", ... }] }] }

GET /api/assignments/windows
Status: 200
Response: { windows: [{ id: "...", status: "active", startsAt: "...", endsAt: "...", ... }] }
```

**Screenshot:** `proof-pack/active-assignment-window.png`

---

### ✅ Scenario 5: Routing Trace Drawer

**Screenshot Required:** "Why routed here?" drawer open showing routing trace

**Steps:**
1. Navigate to `/messages` (Owner Inbox tab)
2. Select any thread
3. Click "Why routed here?" button
4. Verify drawer opens showing:
   - Routing decision explanation
   - Assignment window status
   - Number class (pool/front_desk/sitter)
   - Routing history/timeline

**Network Proof:**
```
GET /api/routing/threads/{threadId}/history
Status: 200
Response: { history: [{ timestamp: "...", decision: "...", reason: "...", ... }] }
```

**Screenshot:** `proof-pack/routing-trace-drawer.png`

---

### ✅ Scenario 6: Numbers Quarantine + Restore Now

**Screenshot Required:** Numbers tab showing quarantined number with "Restore Now" button

**Steps:**
1. Navigate to `/messages` → "Numbers" tab
2. Find quarantined number (status = "quarantined")
3. Verify shows:
   - Quarantine release date
   - "Restore Now" button (if still in cooldown)
   - Duration selector (if creating new quarantine)
4. Click "Restore Now"
5. Enter required reason
6. Verify number is restored immediately
7. Verify audit event created

**Network Proof:**
```
GET /api/numbers?status=quarantined
Status: 200
Response: { numbers: [{ id: "...", status: "quarantined", quarantineReleaseAt: "...", ... }] }

POST /api/numbers/{id}/release
Body: { forceRestore: true, restoreReason: "Testing restore functionality" }
Status: 200
Response: { success: true, message: "Number restored" }
```

**Screenshot:** `proof-pack/quarantine-restore-now.png`

---

### ✅ Scenario 7: Quarantine Duration Selector

**Screenshot Required:** Quarantine modal showing duration selector

**Steps:**
1. Navigate to `/messages` → "Numbers" tab
2. Select an active number
3. Click "Quarantine" action
4. Verify modal shows:
   - Duration selector (1, 3, 7, 14, 30, 90 days)
   - Custom date picker option
   - "Quarantine" button
5. Select duration (e.g., 7 days)
6. Click "Quarantine"
7. Verify number is quarantined with selected duration

**Network Proof:**
```
POST /api/numbers/{id}/quarantine
Body: { durationDays: 7 }
Status: 200
Response: { success: true, impact: { ... } }
```

**Screenshot:** `proof-pack/quarantine-duration-selector.png`

---

### ✅ Scenario 8: Twilio Setup Status

**Screenshot Required:** Twilio Setup tab showing connection status

**Steps:**
1. Navigate to `/messages` → "Twilio Setup" tab
2. Verify shows:
   - Provider connection status (Connected/Not Connected)
   - Webhook status (Installed/Not Installed)
   - Readiness checks (Provider, Numbers, Webhooks)
3. If not connected:
   - Enter Account SID and Auth Token
   - Click "Connect Provider"
   - Verify connection succeeds
4. Click "Test Connection"
5. Verify test succeeds

**Network Proof:**
```
GET /api/setup/provider/status
Status: 200
Response: { connected: true, accountSid: "...", hasAuthToken: true, ... }

GET /api/setup/webhooks/status
Status: 200
Response: { installed: true, url: "...", lastReceivedAt: "...", ... }

GET /api/setup/readiness
Status: 200
Response: { provider: { ready: true, message: "..." }, numbers: { ready: true, ... }, webhooks: { ready: true, ... }, overall: true }
```

**Screenshot:** `proof-pack/twilio-setup-status.png`

---

## Network Proof Summary

### Required Endpoints (All Must Return 200)

| Endpoint | Method | Purpose | Expected Status |
|----------|--------|---------|----------------|
| `/api/messages/threads` | GET | List threads | 200 |
| `/api/messages/threads?unreadOnly=true` | GET | Filter unread | 200 |
| `/api/messages/threads?hasPolicyViolation=true` | GET | Filter policy violations | 200 |
| `/api/messages/threads?hasDeliveryFailure=true` | GET | Filter delivery failures | 200 |
| `/api/messages/threads/{threadId}` | GET | Get thread details | 200 |
| `/api/messages/threads/{threadId}/messages` | GET | Get messages | 200 |
| `/api/messages/{messageId}/retry` | POST | Retry failed message | 200 |
| `/api/routing/threads/{threadId}/history` | GET | Get routing history | 200 |
| `/api/numbers` | GET | List numbers | 200 |
| `/api/numbers?status=quarantined` | GET | Filter quarantined | 200 |
| `/api/numbers/{id}/quarantine` | POST | Quarantine number | 200 |
| `/api/numbers/{id}/release` | POST | Release from quarantine | 200 |
| `/api/assignments/windows` | GET | List assignment windows | 200 |
| `/api/setup/provider/status` | GET | Provider status | 200 |
| `/api/setup/webhooks/status` | GET | Webhook status | 200 |
| `/api/setup/readiness` | GET | System readiness | 200 |
| `/api/messages/seed-proof` | POST | Seed demo data | 200 |

---

## Screenshot Checklist

- [ ] `navigation-sidebar.png` - Sidebar showing Messaging only once
- [ ] `messages-page-tabs.png` - `/messages` page with internal tabs
- [ ] `unread-thread-list.png` - Thread list with unread indicator
- [ ] `failed-delivery-retry.png` - Failed message with Retry button
- [ ] `policy-violation-banner.png` - Policy violation banner visible
- [ ] `active-assignment-window.png` - Active assignment window indicator
- [ ] `routing-trace-drawer.png` - Routing trace drawer open
- [ ] `quarantine-restore-now.png` - Quarantined number with Restore Now
- [ ] `quarantine-duration-selector.png` - Quarantine modal with duration selector
- [ ] `twilio-setup-status.png` - Twilio Setup tab showing status

---

## How to Generate Proof

1. **Seed Demo Data:**
   ```bash
   # Option 1: Use UI button
   # Navigate to /messages → Click "Generate Demo Data"
   
   # Option 2: CLI
   tsx scripts/seed-messaging-proof.ts
   ```

2. **Take Screenshots:**
   - Use browser DevTools (Cmd+Shift+P → "Capture screenshot")
   - Or use Playwright: `playwright test tests/proof-pack.spec.ts`

3. **Capture Network Logs:**
   - Open DevTools → Network tab
   - Filter by "Fetch/XHR"
   - Perform each action
   - Export HAR file: Right-click → "Save all as HAR"

4. **Verify All Endpoints:**
   - Check Network tab for all requests
   - Verify status codes are 200
   - Verify response shapes match expected format

---

## Definition of Done

✅ All screenshots captured  
✅ All network requests return 200  
✅ All features visible in UI  
✅ Seed script creates all scenarios  
✅ "Generate Demo Data" button works  
✅ No navigation duplication  
✅ All tabs functional inside `/messages`

---

## Troubleshooting

**No threads visible:**
- Run seed script: `tsx scripts/seed-messaging-proof.ts`
- Or click "Generate Demo Data" button in `/messages`

**API returns 401/403:**
- Ensure logged in as owner
- Check session is valid

**Seed button not visible:**
- Check `NODE_ENV !== 'production'` OR `NEXT_PUBLIC_ENABLE_OPS_SEED === 'true'`
- Ensure logged in as owner

**Features not visible:**
- Verify seed script ran successfully
- Check database has demo data
- Refresh page after seeding
