# Staging Verification Checklist - Phase 6

**Purpose:** Runtime proof that Phase 6 seed and features work in staging

**Prerequisites:**
- Phase 6 commits deployed to staging
- Build SHA visible in staging UI (bottom-right badge)
- Owner account logged in: `leah2maria@gmail.com` (or your owner account)

---

## Step 1: Verify Deployment

- [ ] Navigate to staging URL
- [ ] Check bottom-right build badge shows latest commit SHA
- [ ] Verify commit includes: `fa0c4b1` (Fix seed endpoint: Call seed logic directly)

---

## Step 2: Seed Demo Data

**Option A: UI Button**
1. Navigate to `/messages?tab=inbox`
2. If no threads visible, click "Generate Demo Data" button
3. Wait for success alert
4. Page should refresh automatically

**Option B: API Call**
```bash
curl -X POST https://your-staging-url.com/api/messages/seed-proof \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Proof scenarios seeded successfully",
  "summary": {
    "unreadThreadId": "...",
    "failedDeliveryThreadId": "...",
    "failedMessageId": "...",
    "policyViolationThreadId": "...",
    "violationMessageId": "...",
    "quarantinedNumberE164": "+15559876545",
    "sitterName": "Sarah Johnson"
  }
}
```

**Network Proof:**
- [ ] `POST /api/messages/seed-proof` → Status: **200**
- [ ] Response includes `success: true`
- [ ] Response includes `summary` object with thread IDs

---

## Step 3: Verify Thread List

**Screenshot Required:** `/messages?tab=inbox` showing at least 3 threads

**Steps:**
1. Navigate to `/messages?tab=inbox`
2. Verify thread list shows:
   - At least 3 threads visible
   - One thread shows unread indicator (badge or bold)
   - Threads have client names visible

**Network Proof:**
- [ ] `GET /api/messages/threads` → Status: **200**
- [ ] Response includes `threads` array with at least 3 items
- [ ] At least one thread has `ownerUnreadCount > 0`

**Screenshot:** `proof-pack/staging-thread-list.png`

---

## Step 4: Failed Delivery + Retry

**Screenshot Required:** Failed message with Retry button visible

**Steps:**
1. Filter by "Delivery Failures" OR find thread with failed message
2. Select thread
3. Verify message panel shows:
   - Message with "Failed" badge (red)
   - "Retry" button visible next to failed message
4. Click "Retry" button
5. Verify message status updates (check delivery status)

**Network Proof:**
- [ ] `GET /api/messages/threads?hasDeliveryFailure=true` → Status: **200**
- [ ] `GET /api/messages/threads/{threadId}/messages` → Status: **200**
- [ ] Response includes message with `deliveryStatus: "failed"`
- [ ] `POST /api/messages/{messageId}/retry` → Status: **200**
- [ ] Retry response includes `success: true`

**Screenshot:** `proof-pack/staging-failed-delivery-retry.png`

---

## Step 5: Policy Violation Banner

**Screenshot Required:** Policy violation banner visible on message

**Steps:**
1. Filter by "Policy Issues" OR find thread with policy violation
2. Select thread
3. Verify message panel shows:
   - Red "Policy violation detected" banner
   - Message body shows redacted content (`[REDACTED]`)
   - Banner explains what was redacted

**Network Proof:**
- [ ] `GET /api/messages/threads?hasPolicyViolation=true` → Status: **200**
- [ ] `GET /api/messages/threads/{threadId}/messages` → Status: **200**
- [ ] Response includes message with `hasPolicyViolation: true` or `metadataJson` containing violation info

**Screenshot:** `proof-pack/staging-policy-violation-banner.png`

---

## Step 6: Routing Trace Drawer

**Screenshot Required:** "Why routed here?" drawer open with trace

**Steps:**
1. Select any thread
2. Click "Why routed here?" button
3. Verify drawer opens showing:
   - Routing decision explanation
   - Evaluation trace steps
   - Assignment window status
   - Number class (pool/front_desk/sitter)

**Network Proof:**
- [ ] `GET /api/routing/threads/{threadId}/history` → Status: **200**
- [ ] Response includes `events` array with routing decisions
- [ ] Each event includes `decision` object with `target`, `reason`, `evaluationTrace`

**Screenshot:** `proof-pack/staging-routing-trace-drawer.png`

---

## Step 7: Active Assignment Window

**Screenshot Required:** Thread showing active assignment window indicator

**Steps:**
1. Find thread with active assignment window (should be the unread thread)
2. Verify thread header shows:
   - Sitter name visible
   - "Active" badge/indicator
   - Window dates (start/end) if visible
3. Navigate to "Assignments" tab
4. Verify window appears in list with "Active" status

**Network Proof:**
- [ ] `GET /api/messages/threads` → Status: **200**
- [ ] Response includes thread with `assignedSitter` and `assignmentWindows` array
- [ ] At least one window has `status: "active"` and current time between `startsAt` and `endsAt`
- [ ] `GET /api/assignments/windows` → Status: **200**
- [ ] Response includes active window

**Screenshot:** `proof-pack/staging-active-assignment-window.png`

---

## Step 8: Quarantine + Restore Now

**Screenshot Required:** Numbers tab showing quarantined number with Restore Now

**Steps:**
1. Navigate to `/messages?tab=numbers`
2. Find quarantined number (status = "quarantined")
3. Verify shows:
   - Quarantine release date
   - "Restore Now" button visible
4. Click "Restore Now"
5. Enter reason: "Testing restore functionality"
6. Click "Restore"
7. Verify:
   - Success toast/message appears
   - Number status changes to "active"
   - Number appears in active numbers list

**Network Proof:**
- [ ] `GET /api/numbers?status=quarantined` → Status: **200**
- [ ] Response includes number with `status: "quarantined"` and `quarantineReleaseAt`
- [ ] `POST /api/numbers/{id}/release` → Status: **200**
- [ ] Request body includes `{ forceRestore: true, restoreReason: "..." }`
- [ ] Response includes `success: true, message: "Number restored"`

**Screenshot:** `proof-pack/staging-quarantine-restore-now.png`

---

## Step 9: Navigation Verification

**Screenshot Required:** Sidebar showing Messaging only once

**Steps:**
1. Open sidebar (hamburger menu)
2. Verify "Messaging" appears exactly once
3. Verify NO nested items under Messaging (no "Inbox", "Numbers", etc.)
4. Click "Messaging"
5. Verify navigates to `/messages`
6. Verify internal tabs visible: "Owner Inbox", "Sitters", "Numbers", "Assignments", "Twilio Setup"

**Screenshot:** `proof-pack/staging-navigation-sidebar.png`
**Screenshot:** `proof-pack/staging-messages-page-tabs.png`

---

## Error Handling

**If any endpoint returns 404/401/500:**

1. **404 Not Found:**
   - Check route file exists in `src/app/api/`
   - Verify route path matches expected URL
   - Check for typos in route file name

2. **401 Unauthorized:**
   - Verify logged in as owner
   - Check session cookie is valid
   - Verify `getServerSession` is working

3. **500 Internal Server Error:**
   - Check server logs
   - Verify database connection
   - Check Prisma schema matches database
   - Verify environment variables are set

**DO NOT PROCEED** until all endpoints return 200.

---

## Final Checklist

- [ ] All 8 scenarios verified with screenshots
- [ ] All network requests return 200
- [ ] Seed endpoint works (POST /api/messages/seed-proof → 200)
- [ ] Navigation shows Messaging only once (no duplication)
- [ ] All features visible in UI
- [ ] No console errors in browser DevTools
- [ ] No 404/401/500 errors in Network tab

---

## Deliverables

**Required:**
1. Screenshots (8 total):
   - Thread list with 3+ threads
   - Failed delivery + Retry button
   - Policy violation banner
   - Routing trace drawer open
   - Active assignment window indicator
   - Quarantined number + Restore Now
   - Navigation sidebar (Messaging once)
   - Messages page tabs

2. Network Proof (DevTools screenshots):
   - POST /api/messages/seed-proof → 200
   - GET /api/messages/threads → 200
   - GET /api/messages/threads/{id}/messages → 200
   - GET /api/routing/threads/{id}/history → 200
   - POST /api/messages/{id}/retry → 200
   - POST /api/numbers/{id}/release → 200

3. Build SHA:
   - Visible in staging UI
   - Matches latest commit: `fa0c4b1` or later

---

## Definition of Done

✅ Seed creates all scenarios  
✅ All features visible in UI  
✅ All network requests return 200  
✅ Navigation has no duplication  
✅ Screenshots captured  
✅ Network proof captured  

**Only then proceed to Phase 3.**
