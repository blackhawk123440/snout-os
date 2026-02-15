# Simple Test Steps for Messaging & Masking

## What You Need to Test

1. **Sitters list works** (no 404s)
2. **Messages/threads appear** (inbox shows conversations)
3. **Masking numbers work** (messages send from correct number)
4. **You can send messages** (compose and send works)

## Step-by-Step Test

### Step 1: Create Test Data (One Click)

1. **Go to:** `https://snout-os-staging.onrender.com/messages?tab=inbox`
2. **Look for:** "Generate Demo Data" button (bottom-right corner, or in the empty state message)
3. **Click it**
4. **Wait for:** Success message
5. **Refresh the page** (F5)

**What this does:** Creates fake threads, messages, and sitters so you can test everything.

### Step 2: Check Sitters Tab

1. **Click:** "Sitters" tab (top of messages page)
2. **Expected:** You see a list of sitters (or "No sitters found" if empty)
3. **Check DevTools:** 
   - Press F12 → Network tab
   - Look for: `GET /api/sitters` → Should be `200 OK` (not 404)
   - Check Response Headers: Should have `X-Snout-Api: sitters-route-hit`

### Step 3: Check Messages/Threads

1. **Stay on:** "Owner Inbox" tab
2. **Expected:** You see at least 1 thread in the list on the left
3. **Click a thread**
4. **Expected:** Messages appear on the right side
5. **Check DevTools:**
   - Network tab → `GET /api/messages/threads` → Should be `200 OK`
   - Network tab → `GET /api/messages/threads/:id/messages` → Should be `200 OK`

### Step 4: Test Sending a Message

1. **Select a thread** (click one from the list)
2. **Type a message** in the box at the bottom
3. **Click "Send"**
4. **Expected:** 
   - Message appears in the thread immediately
   - Shows "Sent" or "Delivered" status
5. **Check DevTools:**
   - Network tab → `POST /api/messages/send` → Should be `200 OK`

### Step 5: Test Masking (Verify Number Assignment)

1. **Go to:** "Numbers" tab
2. **Expected:** You see a list of phone numbers
3. **Find a number** that shows "Assigned To: [Sitter Name]"
4. **Go back to:** "Owner Inbox" tab
5. **Select a thread** that has an active assignment window
6. **Click:** "Why routed here?" button (if visible)
7. **Expected:** Drawer opens showing which number is being used

## What to Look For (Success Signs)

✅ **Sitters Tab:** Shows sitters (no 404 errors)  
✅ **Inbox Tab:** Shows threads and messages  
✅ **Send Message:** Message appears after sending  
✅ **Numbers Tab:** Shows numbers with assignments  
✅ **Network Tab:** All requests show `200 OK` (not 404 or 500)  

## If Something Doesn't Work

### Problem: "No sitters found" but you know sitters exist
- **Check:** DevTools → Network → `GET /api/sitters` → Status code
- **If 404:** Route not deployed, check Render logs
- **If 401:** Not logged in, log out and back in
- **If 200 with empty array:** Sitters are in a different org

### Problem: "No threads found" after clicking Generate Demo Data
- **Check:** DevTools → Network → `POST /api/messages/seed-proof` → Status code
- **If 403:** Seed endpoint disabled, set `ENABLE_OPS_SEED=true` in Render env vars
- **If 500:** Check server logs for error
- **If 200:** Data created, refresh page

### Problem: Can't send messages
- **Check:** DevTools → Network → `POST /api/messages/send` → Status code
- **If 400:** Check error message in response
- **If 500:** Check server logs
- **If Twilio error:** Check Twilio setup in "Twilio Setup" tab

## Quick Checklist

- [ ] Clicked "Generate Demo Data" button
- [ ] Refreshed page
- [ ] Sitters tab shows sitters (or empty state, not 404)
- [ ] Inbox tab shows at least 1 thread
- [ ] Can click thread and see messages
- [ ] Can send a message
- [ ] Numbers tab shows numbers
- [ ] All Network requests show `200 OK`

## Still Confused?

**Tell me which step you're on and what you see:**
- "I clicked Generate Demo Data but nothing happened"
- "I see threads but can't send messages"
- "Sitters tab shows 404"
- "I don't see the Generate Demo Data button"
