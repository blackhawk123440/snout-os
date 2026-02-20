# 🧪 Testing Messaging System on Staging

## Staging Dashboard URL
**https://snout-os-staging.onrender.com**

## Test Checklist

### 1. Access the Messages Page
- Navigate to: **https://snout-os-staging.onrender.com/messages**
- **Expected:**
  - Page loads without errors
  - Owner Inbox tab is visible
  - Thread list appears (may be empty)

### 2. Test "Message Anyone" Feature
- Click **"New Message"** button
- Enter phone number: `+15551234567` (E.164 format)
- Enter message: "Test message from staging"
- Click "Send"
- **Expected:**
  - Thread created successfully
  - Thread appears in list
  - Message visible in message view

### 3. Verify Network Calls (DevTools)
Open DevTools → Network tab and verify:

**Thread Creation:**
- `POST https://snout-os-staging.onrender.com/api/messages/threads`
- Status: **200 OK**
- Response: `{ threadId, clientId, reused: false }`

**Message Sending:**
- `POST https://snout-os-staging.onrender.com/api/messages/threads/:id/messages`
- Status: **200 OK**
- Response: `{ messageId, hasPolicyViolation: false }`

**Thread Loading:**
- `GET https://snout-os-staging.onrender.com/api/messages/threads?scope=internal`
- Status: **200 OK** (not 500!)
- Response: Array of threads

### 4. Check for Errors
- **Browser Console:** No red errors
- **Network Tab:** All requests return 200 (not 500)
- **UI:** No loading spinners stuck

### 5. Verify Layout
- Thread list on left (33% width)
- Message view on right (67% width)
- Compose box pinned to bottom
- No overflow issues

## Known Issues to Verify Fixed

### ✅ Fixed: 500 Error on `/api/messages/threads?scope=internal`
- **Before:** Returned 500 Internal Server Error
- **After:** Should return 200 with thread array
- **Fix:** Added `threadType: 'front_desk'` filter when `scope=internal`

### ✅ Fixed: TypeScript Build Errors
- **Before:** Build failed with `startAt` vs `startsAt` error
- **After:** Build should succeed
- **Fix:** Corrected field names in SRS message processor

## If You See Issues

### Issue: Still getting 500 on threads endpoint
- **Check:** Latest commit is deployed
- **Check:** Server logs in Render dashboard
- **Action:** May need to redeploy

### Issue: "New Message" button doesn't work
- **Check:** Browser console for errors
- **Check:** Network tab for failed requests
- **Verify:** You're logged in as owner

### Issue: Messages not sending
- **Check:** Network request to `/api/messages/threads/:id/messages`
- **Check:** Response status code
- **Verify:** Front desk number is configured in database

## Database Verification (Optional)

If you have database access, verify:

```sql
-- Check unique constraint works
SELECT orgId, e164, COUNT(*) as count
FROM "ClientContact"
GROUP BY orgId, e164
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Check threads per org+client
SELECT orgId, "clientId", COUNT(*) as thread_count
FROM "Thread"
GROUP BY orgId, "clientId"
HAVING COUNT(*) > 1;
-- Expected: 0 rows (one thread per client per org)
```

## Deployment Status

**Latest fixes deployed:**
- ✅ Fixed `startAt` → `startsAt` in SRS processor
- ✅ Removed `status` field from AssignmentWindow query
- ✅ Fixed WebhooksService test constructors
- ✅ Added defensive error handling for Prisma relations
- ✅ Fixed `scope=internal` filter for owner inbox

**Commit:** Latest on `main` branch
