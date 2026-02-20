# 🧪 Testing the Messaging System

## Quick Start

The dev server should be running at: **http://localhost:3000**

## Test Checklist

### 1. Access the Messages Page
- Navigate to: **http://localhost:3000/messages**
- You should see the Owner Inbox tab with:
  - Thread list on the left (33% width)
  - Message view on the right (67% width)
  - "New Message" button to start conversations

### 2. Test "Message Anyone" Feature
- Click the **"New Message"** button
- Enter a phone number in E.164 format (e.g., `+15551234567`)
- Enter an initial message
- Click "Send"
- **Expected behavior:**
  - New thread created in the thread list
  - Thread opens automatically
  - Message appears in the message view
  - "From" number should be the front_desk/master number

### 3. Test Thread List
- Verify threads are displayed in the left panel
- Click on different threads
- **Expected:**
  - Selected thread highlights
  - Messages load in the right panel
  - Thread header shows client name and number

### 4. Test Sending Messages
- Select a thread
- Type a message in the compose box at the bottom
- Click "Send"
- **Expected:**
  - Message appears immediately in the message list
  - Message is sent via `POST /api/messages/threads/:id/messages`
  - No errors in console

### 5. Test Layout
- Verify the layout is responsive:
  - No overflow or dead whitespace
  - Thread list and message panel fit properly
  - Compose box is pinned to bottom
  - Diagnostics panel (if visible) doesn't dominate

### 6. Test Sitter Inbox (if logged in as sitter)
- Navigate to: **http://localhost:3000/sitter/inbox**
- **Expected:**
  - Shows sitter name in header
  - Shows assigned masked number status
  - Displays booking context for each thread
  - Shows "blocked outside window" message when appropriate

## Network Verification

Open DevTools → Network tab and verify:

1. **Thread Creation:**
   - `POST /api/messages/threads` returns 200
   - Response includes: `{ threadId, clientId, reused: false }`

2. **Message Sending:**
   - `POST /api/messages/threads/:id/messages` returns 200
   - Request body includes: `{ body: "...", forceSend: false }`
   - Response includes: `{ messageId, hasPolicyViolation: false }`

3. **Thread Loading:**
   - `GET /api/messages/threads?scope=internal` returns 200
   - Response includes array of threads with proper structure

## Common Issues

### Issue: 500 Error on `/api/messages/threads`
- **Check:** Database connection
- **Check:** Prisma client is generated
- **Fix:** Run `npm run postinstall` to regenerate Prisma client

### Issue: Threads not loading
- **Check:** Browser console for errors
- **Check:** Network tab for failed requests
- **Verify:** You're logged in as owner

### Issue: "New Message" button not working
- **Check:** Modal opens correctly
- **Check:** Phone number validation (must be E.164 format)
- **Verify:** Front desk number is configured

## Database Verification

To verify the database state:

```sql
-- Check unique constraint on ClientContact
SELECT orgId, e164, COUNT(*) as count
FROM "ClientContact"
GROUP BY orgId, e164
HAVING COUNT(*) > 1;
-- Expected: 0 rows (proves uniqueness)

-- Check threads per org+client
SELECT orgId, "clientId", COUNT(*) as thread_count
FROM "Thread"
GROUP BY orgId, "clientId"
HAVING COUNT(*) > 1;
-- Expected: 0 rows (one thread per client per org)
```

## Next Steps

After basic testing:
1. Test with multiple phone numbers
2. Test thread reuse (same phone number twice)
3. Test concurrent requests (if possible)
4. Verify front_desk number assignment
5. Test sitter inbox with active assignments
