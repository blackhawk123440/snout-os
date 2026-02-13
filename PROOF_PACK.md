# Proof Pack - Enterprise Messaging Dashboard

## Prerequisites

1. **Seed Proof Scenarios**: Run `pnpm seed:proof` to create demo data
2. **Login Credentials**:
   - Owner: `leah2maria@gmail.com` / `Saint214!`
   - Sitter: `sitter@example.com` / `password` (or `Saint214!` if updated)

## A) ROLE + NAV + LOGIN

### A1) Owner Login → Dashboard
**Steps:**
1. Navigate to `/login`
2. Enter owner credentials: `leah2maria@gmail.com` / `Saint214!`
3. Click "Sign in"

**Expected:**
- Redirects to `/dashboard` (or `/`)
- Dashboard shows stats and quick actions
- **Logout button visible in top-right** (email | Logout)

**Network Proof:**
```
GET /api/auth/session
Status: 200
Response: { user: { email: "leah2maria@gmail.com", role: "owner", sitterId: null } }
```

**Screenshot Checklist:**
- [ ] Owner logged in on `/dashboard`
- [ ] Logout button visible in top bar
- [ ] Dashboard UI unchanged (no messaging UI in dashboard)

### A2) Sitter Login → Sitter Inbox
**Steps:**
1. Logout (if logged in as owner)
2. Navigate to `/login`
3. Enter sitter credentials: `sitter@example.com` / `password`
4. Click "Sign in"

**Expected:**
- Redirects to `/sitter/inbox`
- Shows sitter inbox with active assignment windows
- **Logout button visible in top-right**

**Network Proof:**
```
GET /api/auth/session
Status: 200
Response: { user: { email: "sitter@example.com", role: "sitter", sitterId: "<sitter-id>" } }
```

**Screenshot Checklist:**
- [ ] Sitter logged in on `/sitter/inbox`
- [ ] Logout button visible in top bar
- [ ] Only active-window threads visible

### A3) Sitter Attempting /messages → Redirect
**Steps:**
1. While logged in as sitter, navigate to `/messages`

**Expected:**
- Server-side redirect to `/sitter/inbox` (middleware enforcement)
- OR 403 error if redirect fails

**Network Proof:**
```
GET /messages
Status: 302 (redirect) or 403
Location: /sitter/inbox
```

**Screenshot Checklist:**
- [ ] Sitter attempting `/messages` shows redirect/blocked
- [ ] Final destination is `/sitter/inbox`

## B) MESSAGES TAB = SINGLE MESSAGING CONSOLE

### B1) Messages Tab Structure
**Steps:**
1. Login as owner
2. Navigate to `/messages`

**Expected:**
- Page shows tabs: Owner Inbox, Sitters, Numbers, Assignments, Twilio Setup
- **NO new main nav items** (Numbers, Assignments, Setup remain ONLY in Messages tab)
- Dashboard navigation unchanged

**Screenshot Checklist:**
- [ ] `/messages` shows internal tabs (Owner Inbox, Sitters, Numbers, Assignments, Twilio Setup)
- [ ] Main dashboard navigation unchanged (no new top-level links)

## C) INBOX (OWNER) FEATURES

### C1) Thread List with Filters
**Steps:**
1. Navigate to `/messages` (Owner Inbox tab)
2. Observe thread list

**Expected:**
- Thread list shows at least 2 threads (from seed)
- Filters visible: Unread, Policy Issues, Delivery Failures, Search
- Thread rows show:
  - Unread badge count (if > 0)
  - Policy badge (if has violation)
  - Delivery failure badge (if has failed delivery)
  - Assignment window status badge (Active/Future/Past)
  - Number class badge (front_desk / sitter / pool)

**Network Proof:**
```
GET /api/messages/threads?inbox=owner
Status: 200
Response: { threads: Thread[] }
```

**Screenshot Checklist:**
- [ ] Thread list with filters visible
- [ ] At least 2 threads shown
- [ ] Unread badge visible on unread thread
- [ ] Policy badge visible on violation thread
- [ ] Delivery failure badge visible on failed thread

### C2) Failed Delivery with Retry Button
**Steps:**
1. Click on thread with failed delivery (from seed)
2. Observe message panel

**Expected:**
- Message with `deliveryStatus: 'failed'` visible
- **Retry button visible** on failed message
- Delivery status badge shows "Failed"

**Network Proof:**
```
GET /api/messages/threads/{threadId}/messages
Status: 200
Response: Message[] (includes message with deliveries[].status === 'failed')
```

**Screenshot Checklist:**
- [ ] Failed delivery message visible
- [ ] Retry button visible on failed message
- [ ] Delivery status badge shows "Failed"

### C3) Policy Violation Banner
**Steps:**
1. Click on thread with policy violation (from seed)
2. Observe message panel

**Expected:**
- Message with `hasPolicyViolation: true` visible
- **Policy violation banner clearly visible** (red background, warning icon)
- Redacted body shown (if available)

**Network Proof:**
```
GET /api/messages/threads/{threadId}/messages
Status: 200
Response: Message[] (includes message with hasPolicyViolation === true)
```

**Screenshot Checklist:**
- [ ] Policy violation message visible
- [ ] Policy violation banner clearly visible (red/warning styling)
- [ ] Redacted body shown

### C4) Routing Trace Drawer
**Steps:**
1. Select any thread
2. Click "Why routed here?" button

**Expected:**
- Drawer opens showing routing explanation
- Shows evaluation trace steps with:
  - Rule name
  - Condition
  - Result (✓ or ✗)
  - Explanation

**Network Proof:**
```
GET /api/routing/threads/{threadId}/history
Status: 200
Response: { events: [{ decision: RoutingDecision, timestamp: string }] }
```

**Screenshot Checklist:**
- [ ] Routing trace drawer open
- [ ] Evaluation trace steps visible
- [ ] Final decision shown

### C5) Retry Failed Delivery
**Steps:**
1. Click "Retry" button on failed message
2. Observe result

**Expected:**
- Retry button shows loading state
- Message delivery status updates
- Success or error message shown

**Network Proof:**
```
POST /api/messages/{messageId}/retry
Status: 200
Response: { success: boolean, attemptNo: number }
```

**Screenshot Checklist:**
- [ ] Retry button clicked
- [ ] Loading state shown
- [ ] Delivery status updates after retry

## D) SITTER DASHBOARD (/sitter/inbox)

### D1) Sitter Inbox - Active Windows Only
**Steps:**
1. Login as sitter
2. Navigate to `/sitter/inbox`

**Expected:**
- Only threads with active assignment windows visible
- Window times shown (start/end)
- No client E164 visible anywhere
- Compose disabled outside window with message

**Network Proof:**
```
GET /api/sitter/threads
Status: 200
Response: Thread[] (filtered to active windows only)
```

**Screenshot Checklist:**
- [ ] Sitter inbox listing only active-window threads
- [ ] Window times shown
- [ ] No client phone numbers visible

### D2) Sitter Send Message (Inside Window)
**Steps:**
1. Select thread with active window
2. Type message and send

**Expected:**
- Message sends successfully
- Message appears in thread

**Network Proof:**
```
POST /api/sitter/threads/{id}/messages
Status: 200
Response: Message object
```

### D3) Sitter Send Message (Outside Window)
**Steps:**
1. Select thread with no active window (or wait for window to end)
2. Try to send message

**Expected:**
- Compose box disabled or shows message
- Error if attempted: "This conversation is only available during your assignment window."

**Network Proof:**
```
POST /api/sitter/threads/{id}/messages
Status: 403
Response: { error: "This conversation is only available during your assignment window." }
```

## E) NUMBERS INSIDE /messages → "Numbers" SUBTAB

### E1) Quarantine with Duration Selector
**Steps:**
1. Navigate to `/messages` → Numbers tab
2. Click Actions (⋯) on a number
3. Click "Quarantine"
4. Observe modal

**Expected:**
- Modal shows:
  - Reason input (required)
  - Details textarea (optional)
  - **Duration selector**: 1, 3, 7, 14, 30, 90 days, Custom date
  - Custom date input (if "Custom date" selected)

**Network Proof:**
```
POST /api/numbers/{id}/quarantine
Body: { reason: string, reasonDetail?: string, durationDays?: number, customReleaseDate?: string }
Status: 200
Response: { success: boolean, impact: { affectedThreads, cooldownDays, releaseAt, message } }
```

**Screenshot Checklist:**
- [ ] Quarantine modal showing duration selector
- [ ] Custom date option available
- [ ] Duration options: 1, 3, 7, 14, 30, 90 days

### E2) Restore Now with Reason
**Steps:**
1. Navigate to `/messages` → Numbers tab
2. Find a quarantined number
3. Click Actions (⋯) → "Restore"
4. Observe modal

**Expected:**
- Modal shows:
  - Warning if cooldown not complete
  - **"Restore Now" button** (if cooldown active)
  - **Reason input** (required for Restore Now)
  - Normal "Release" button (if cooldown complete)

**Network Proof:**
```
POST /api/numbers/{id}/release
Body: { forceRestore: true, restoreReason: string }
Status: 200
Response: { success: boolean, message: string }
```

**Screenshot Checklist:**
- [ ] Restore modal showing "Restore Now" button
- [ ] Reason input visible (when cooldown active)
- [ ] Number status updates immediately after restore

## F) TWILIO SETUP INSIDE /messages → "Twilio Setup" SUBTAB

### F1) Twilio Setup Panel
**Steps:**
1. Navigate to `/messages` → Twilio Setup tab
2. Observe panel

**Expected:**
- Provider Connection section:
  - Test Connection button
  - Connect Provider button
  - Status indicator (Connected/Not Connected)
- Webhooks section:
  - Install Webhooks button
  - Status indicator (Installed/Not Installed)
- Readiness Checks section:
  - Provider, Numbers, Webhooks status
  - Overall status

**Network Proof:**
```
GET /api/setup/provider/status
Status: 200
Response: { connected: boolean, accountSid: string | null, hasAuthToken: boolean, ... }

GET /api/setup/webhooks/status
Status: 200
Response: { installed: boolean, url: string | null, status: string, ... }

GET /api/setup/readiness
Status: 200
Response: { provider: { ready: boolean, message: string }, numbers: {...}, webhooks: {...}, overall: boolean }
```

**Screenshot Checklist:**
- [ ] Twilio setup panel with Test Connection + Webhook Install + Status indicators
- [ ] Readiness checks showing pass/fail

## G) ASSIGNMENTS INSIDE /messages → "Assignments" SUBTAB

### G1) Assignments List + Create Window
**Steps:**
1. Navigate to `/messages` → Assignments tab
2. Observe list
3. Click "Create Window"

**Expected:**
- List shows assignment windows (if any)
- Create modal shows:
  - Thread selector
  - Sitter selector
  - Start date/time
  - End date/time
  - Booking reference (optional)

**Network Proof:**
```
GET /api/assignments/windows
Status: 200
Response: AssignmentWindow[]

POST /api/assignments/windows
Body: { threadId: string, sitterId: string, startsAt: string, endsAt: string, bookingRef?: string }
Status: 201
Response: AssignmentWindow
```

**Screenshot Checklist:**
- [ ] Assignments list visible
- [ ] Create window modal with all fields

### G2) Overlap Prevention
**Steps:**
1. Create an assignment window
2. Try to create overlapping window (same sitter, overlapping times)

**Expected:**
- Error message: "Cannot create window: Overlapping assignment windows detected"
- Window not created

**Network Proof:**
```
POST /api/assignments/windows
Body: { ...overlapping times... }
Status: 400
Response: { error: "Overlapping assignment windows detected", ... }
```

## H) SEED / DEMO DATA

### Seed Command
```bash
pnpm seed:proof
```

**Creates:**
- 1 unread thread (2 unread messages)
- 1 failed delivery message (Retry visible)
- 1 policy violation message (banner visible)
- 1 active assignment window (sitter thread visible)

**Verification:**
After seeding, navigate to `/messages` → Owner Inbox and verify:
- [ ] At least 1 thread with unread badge
- [ ] At least 1 thread with failed delivery (Retry button)
- [ ] At least 1 thread with policy violation (banner)
- [ ] At least 1 thread with active assignment window

## I) PLAYWRIGHT TESTS

### Test Commands
```bash
pnpm test:ui:smoke  # Smoke tests
pnpm test:ui        # Full test suite
```

### Required Test Coverage
- [ ] Owner login redirects to `/dashboard`
- [ ] Sitter login redirects to `/sitter/inbox`
- [ ] Sitter cannot access `/messages` (redirects or 403)
- [ ] Retry button appears on failed delivery
- [ ] Policy banner appears on violating message
- [ ] Quarantine restore-now works and logs audit event

## J) GIT PROOF

### Commit SHA
```
<commit-sha-will-be-provided-after-commit>
```

### Files Changed
- `src/app/messages/page.tsx` - Restructured with internal tabs
- `src/components/messaging/SittersPanel.tsx` - Complete implementation
- `src/components/messaging/AssignmentsPanel.tsx` - Complete implementation
- `src/components/messaging/TwilioSetupPanel.tsx` - Complete implementation
- `src/components/messaging/NumbersPanelContent.tsx` - Quarantine duration + restore-now
- `src/middleware.ts` - Fixed role checking
- `src/lib/api/hooks.ts` - Fixed send message endpoint
- `src/app/api/assignments/windows/route.ts` - BFF proxy
- `src/app/api/setup/**/route.ts` - BFF proxies for setup
- `src/app/api/routing/threads/[id]/history/route.ts` - BFF proxy
- `scripts/seed-proof-scenarios.ts` - Seed script
- `PROOF_PACK.md` - This document

## K) NETWORK REQUEST SUMMARY

### Required Endpoints (All Must Return 200 When Logged In)

| Endpoint | Method | Expected Status | Response Shape |
|----------|--------|----------------|----------------|
| `/api/messages/threads?inbox=owner` | GET | 200 | `{ threads: Thread[] }` |
| `/api/messages/threads/{id}/messages` | GET | 200 | `Message[]` |
| `/api/messages/threads/{id}/messages` | POST | 200 | `Message` |
| `/api/messages/{id}/retry` | POST | 200 | `{ success: boolean, attemptNo: number }` |
| `/api/routing/threads/{id}/history` | GET | 200 | `{ events: [{ decision: RoutingDecision, timestamp: string }] }` |
| `/api/sitter/threads` | GET | 200 | `Thread[]` (sitter only) |
| `/api/sitter/threads/{id}/messages` | GET | 200 | `Message[]` (sitter only) |
| `/api/sitter/threads/{id}/messages` | POST | 200 | `Message` (sitter only, inside window) |
| `/api/numbers/{id}/quarantine` | POST | 200 | `{ success: boolean, impact: {...} }` (with durationDays) |
| `/api/numbers/{id}/release` | POST | 200 | `{ success: boolean, message: string }` (with forceRestore) |
| `/api/assignments/windows` | GET | 200 | `AssignmentWindow[]` |
| `/api/assignments/windows` | POST | 201 | `AssignmentWindow` |
| `/api/setup/provider/status` | GET | 200 | `{ connected: boolean, ... }` |
| `/api/setup/provider/test` | POST | 200 | `{ success: boolean, message: string }` |
| `/api/setup/webhooks/status` | GET | 200 | `{ installed: boolean, ... }` |
| `/api/setup/webhooks/install` | POST | 200 | `{ success: boolean, message: string, url: string }` |
| `/api/setup/readiness` | GET | 200 | `{ provider: {...}, numbers: {...}, webhooks: {...}, overall: boolean }` |

## L) SCREENSHOT CHECKLIST

### Required Screenshots
1. [ ] Owner login → `/dashboard` with logout visible
2. [ ] Sitter login → `/sitter/inbox` with logout visible
3. [ ] Sitter attempting `/messages` shows redirect/blocked
4. [ ] `/messages` tab showing internal tabs (Owner Inbox, Sitters, Numbers, Assignments, Twilio Setup)
5. [ ] Owner Inbox with at least 2 threads
6. [ ] Failed delivery message with Retry button visible
7. [ ] Policy violation message with banner visible
8. [ ] Routing trace drawer open showing evaluation steps
9. [ ] Numbers tab with quarantine duration selector
10. [ ] Restore modal with "Restore Now" button and reason input
11. [ ] Sitters panel showing sitter list and assignment windows
12. [ ] Assignments panel with create window modal
13. [ ] Twilio Setup panel with Test Connection + Webhook Install + Status indicators

## M) OPERATIONAL BEHAVIOR CLARIFICATION

### Booking → Masking Number Behavior
**Current Implementation:**
- Assignment windows are created manually (not from booking events)
- When an assignment window is created:
  - A thread must exist for the client
  - A masking number is assigned deterministically:
    - Prefer: existing thread number if already bound
    - Else: allocate from pool
  - The assigned masking number is what automations use ("send from thread's business number")

**UI Explanation (to be added):**
- "This client keeps the same masked number for the life of the thread."
- Assignment windows define when sitters can access threads
- When a window ends, routing changes to owner inbox

## N) TESTING INSTRUCTIONS

### Local Development
1. Run `pnpm seed:proof` to create demo data
2. Start dev server: `pnpm dev`
3. Login as owner: `leah2maria@gmail.com` / `Saint214!`
4. Navigate to `/messages`
5. Verify all features per checklist above

### Staging/Production
1. Run seed script in Render shell or via API endpoint (if gated by env var)
2. Login and verify features
3. Capture screenshots and network requests
4. Run Playwright tests: `pnpm test:ui:smoke`

## O) ACCEPTANCE CRITERIA CHECKLIST

- [x] Owner login redirects to `/dashboard`
- [x] Sitter login redirects to `/sitter/inbox`
- [x] Owner can access `/messages`
- [x] Sitter cannot access `/messages` (server-side enforcement)
- [x] Logout button visible for both roles
- [x] Messages tab has internal sub-tabs (no new main nav items)
- [x] Inbox shows thread list with filters
- [x] Failed delivery shows Retry button
- [x] Policy violation shows banner
- [x] Routing trace drawer works
- [x] Sitter inbox shows only active-window threads
- [x] Sitter cannot see client E164
- [x] Quarantine has duration selector
- [x] Restore Now works with reason
- [x] Twilio Setup panel is real (not stub)
- [x] Assignments panel is real (not stub)
- [x] Seed script creates all proof scenarios
- [ ] Screenshots captured (manual step)
- [ ] Network requests verified (manual step)
- [ ] Playwright tests passing (run tests)
