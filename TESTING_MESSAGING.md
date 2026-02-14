# Testing the Messaging System

## Quick Start

### 1. Seed Demo Data (if needed)
```bash
npm run seed:proof
```

This creates:
- 1 unread thread
- 1 failed delivery message (with Retry button)
- 1 policy violation message (with banner)
- 1 active assignment window

### 2. Login Credentials
- **Owner**: `leah2maria@gmail.com` / `Saint214!`
- **Sitter**: `sitter@example.com` / `password`

### 3. Access Messaging

**Owner:**
1. Login as owner
2. Navigate to `/messages` (or click "Messaging" in hamburger menu)
3. You'll see tabs: Owner Inbox, Sitters, Numbers, Assignments, Twilio Setup

**Sitter:**
1. Login as sitter
2. Automatically redirected to `/sitter/inbox`
3. Only sees threads with active assignment windows

## Key Features to Test

### Owner Inbox (`/messages` → Owner Inbox tab)

1. **Thread List**
   - View all threads
   - Filters: Unread, Policy Issues, Delivery Failures
   - Search by client name

2. **Message View**
   - Click a thread to see messages
   - Delivery status badges (Sent/Delivered/Failed)
   - Retry button on failed deliveries
   - Policy violation banners

3. **Send Message**
   - Select a thread
   - Type message in compose box
   - Click Send

4. **Routing Trace**
   - Click "Why routed here?" button
   - See step-by-step routing explanation

### Sitter Inbox (`/sitter/inbox`)

1. **Active Windows Only**
   - Only threads with active assignment windows visible
   - Compose disabled outside window

2. **Send Message**
   - Can send messages during active window
   - Compose disabled outside window

### Numbers Management (`/messages` → Numbers tab)

1. **View Numbers**
   - See all phone numbers
   - Status: Active, Quarantined, Inactive
   - Class: Front Desk, Pool, Sitter

2. **Quarantine**
   - Select a number
   - Click Quarantine
   - Choose duration (1, 7, 30, 90 days, or custom date)

3. **Restore**
   - Select quarantined number
   - Click "Restore Now"
   - Provide reason (bypasses cooldown)

### Assignments (`/messages` → Assignments tab)

1. **View Windows**
   - See all assignment windows
   - Status: Active, Future, Past

2. **Create Window**
   - Click "Create New Window"
   - Select thread, sitter, start/end times
   - Prevents overlaps

### Twilio Setup (`/messages` → Twilio Setup tab)

1. **Provider Connection**
   - Save Twilio credentials
   - Test connection

2. **Webhooks**
   - Install webhooks
   - Check status

3. **Readiness**
   - View overall system readiness
   - Provider, Numbers, Webhooks status

## Network Verification

Open DevTools → Network tab to verify:

- `GET /api/messages/threads` → 200 (threads list)
- `GET /api/messages/threads/:id/messages` → 200 (messages)
- `POST /api/messages/threads/:id/messages` → 200 (send message)
- `POST /api/messages/:id/retry` → 200 (retry failed)
- `GET /api/routing/threads/:id/history` → 200 (routing trace)

All requests should go through BFF proxy (`/api/...`) not directly to API host.
