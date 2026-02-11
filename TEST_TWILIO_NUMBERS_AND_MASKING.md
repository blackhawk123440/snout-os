# Testing Twilio Numbers and Masking

## Prerequisites

1. **Twilio Account Setup**
   - Ensure `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set in Render
   - Ensure `TWILIO_PROXY_SERVICE_SID` is set (required for masking)
   - Ensure `TWILIO_WEBHOOK_URL` points to your API: `https://snout-os-api.onrender.com/api/webhooks/twilio`

2. **Access the Dashboard**
   - Login as owner: `https://snout-os-staging.onrender.com/login`
   - Email: `leah2maria@gmail.com`
   - Password: `Saint214!`

---

## Part 1: Testing Number Management

### Step 1: View Number Inventory

1. Navigate to: `https://snout-os-staging.onrender.com/numbers`
2. You should see:
   - Summary cards showing Front Desk, Pool, and Sitter number counts
   - A table listing all numbers with:
     - Number (E.164 format)
     - Class (Front Desk, Pool, or Sitter)
     - Status (Active, Quarantined, Inactive)
     - Active Threads (for pool numbers)
     - Assigned To (for sitter numbers)

### Step 2: Import a Twilio Number

**Option A: Import by E.164**
1. Click "Import Number"
2. Select Number Class (Front Desk, Pool, or Sitter)
3. Enter E.164 number (e.g., `+15551234567`)
4. Click "Import"

**Option B: Import by Twilio SID**
1. Click "Import Number"
2. Select Number Class
3. Enter Twilio Number SID (e.g., `PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
4. Click "Import"

**Verify:**
- Number appears in the table
- Status shows as "Active"
- Class matches what you selected

### Step 3: Buy a Number (if you have Twilio credits)

1. Click "Buy Number"
2. Select Number Class:
   - **Front Desk**: Permanent number for general inquiries
   - **Pool**: Rotating numbers for one-time bookings
   - **Sitter**: Dedicated number for a specific sitter
3. Enter Area Code (optional, e.g., `415`)
4. Enter Quantity (1-10)
5. Click "Purchase"

**Verify:**
- Number appears in inventory
- Status is "Active"
- Number is configured in Twilio

### Step 4: Assign Number to Sitter

1. Find a number with class "Sitter" and status "Active"
2. Click "Assign" button
3. Select a sitter from dropdown
4. Click "Assign"

**Verify:**
- Number shows "Assigned To: [Sitter Name]"
- Number is bound to that sitter

### Step 5: Test Number Quarantine

1. Find an active number
2. Click "Quarantine"
3. Enter reason (e.g., "Spam complaints")
4. Enter details (optional)
5. Click "Quarantine"

**Verify:**
- Number status changes to "Quarantined"
- Number cannot be used for new threads
- Existing threads may be affected (check impact message)

### Step 6: Release from Quarantine

1. Find a quarantined number
2. Click "Release"
3. Confirm release

**Verify:**
- Number status changes back to "Active"
- Number can be used again

---

## Part 2: Testing Masking Functionality

### Understanding Masking

**Masking** ensures that:
- **Clients** never see sitter's real phone numbers
- **Sitters** never see client's real phone numbers
- **Owner** sees all real numbers (full visibility)
- Messages are sent **from** the assigned business number (masked number)

### How Masking Works

1. **Front Desk Number**: Used for general inquiries
   - Client texts → Owner receives on front desk number
   - Owner replies → Client sees message from front desk number

2. **Sitter Number**: Used when sitter is assigned
   - Client texts → Sitter receives on sitter's masked number
   - Sitter replies → Client sees message from sitter's masked number
   - **Real numbers are hidden on both sides**

3. **Pool Number**: Used for one-time bookings
   - Client texts → Owner receives on pool number
   - After booking ends, number is released back to pool
   - If client texts after release → Auto-response sent, routes to owner

### Step 1: Test Front Desk Masking

**Setup:**
1. Ensure you have at least one "Front Desk" number imported
2. Create a test client (or use existing)

**Test:**
1. Send a text message **from your phone** to the Front Desk number
2. Check dashboard: `https://snout-os-staging.onrender.com/messages`
3. You should see:
   - New thread created
   - Thread shows "Front Desk" number class
   - Your message appears in the thread

**Verify Masking:**
- In the thread, you should see messages **from** the Front Desk number
- Your real phone number should **not** be visible to other users
- Owner can see your real number (in client contact info)

### Step 2: Test Sitter Masking

**Setup:**
1. Create or select a sitter
2. Assign a "Sitter" class number to that sitter
3. Create an assignment window for the sitter
4. Create a test client

**Test:**
1. **As Owner**: Create a thread and assign it to the sitter
2. **As Sitter**: Login to `/sitter/inbox`
3. Sitter should see:
   - Thread with client name
   - Messages from sitter's masked number
   - **Client's real phone number is NOT visible**

**Verify Masking:**
- Sitter sees messages **from** their assigned masked number
- Client sees messages **from** the sitter's masked number
- Neither sees the other's real phone number
- Owner can see both real numbers

### Step 3: Test Pool Number Masking

**Setup:**
1. Ensure you have at least one "Pool" number imported
2. Create a one-time booking (or simulate)

**Test:**
1. Send a text **from your phone** to a Pool number
2. Check dashboard: `https://snout-os-staging.onrender.com/messages`
3. You should see:
   - New thread created
   - Thread shows "Pool" number class
   - Your message appears

**Verify Masking:**
- Messages are sent **from** the Pool number
- Your real phone number is masked
- After booking ends, number is released back to pool

### Step 4: Test Masking in Messages Page

**As Owner:**
1. Navigate to: `https://snout-os-staging.onrender.com/messages`
2. Open any thread
3. You should see:
   - **Full visibility**: Real client phone numbers visible
   - **Number class**: Shows which number class is being used (Front Desk, Sitter, Pool)
   - **Messages**: All messages show the masked number as "from"

**As Sitter:**
1. Login as sitter: `https://snout-os-staging.onrender.com/sitter/inbox`
2. Open a thread
3. You should see:
   - **Masked view**: Client's real phone number is NOT visible
   - **Business number**: Messages show from the sitter's masked number
   - **Client name**: Only client name is visible, not phone

---

## Part 3: Testing End-to-End Message Flow

### Test 1: Inbound Message (Client → System)

1. **Send a text from your phone** to one of your Twilio numbers
2. **Check Twilio Console**:
   - Go to: https://console.twilio.com/us1/monitor/logs/sms
   - Verify message was received
   - Check webhook was called: `https://snout-os-api.onrender.com/api/webhooks/twilio`

3. **Check Dashboard**:
   - Navigate to: `https://snout-os-staging.onrender.com/messages`
   - New thread should appear
   - Your message should be visible

**Verify:**
- Message appears in correct thread
- Number class is correct (Front Desk, Sitter, or Pool)
- Masking is working (you see messages from business number)

### Test 2: Outbound Message (System → Client)

1. **In Dashboard**: Open a thread
2. **Type a message** and send
3. **Check your phone**: You should receive the message

**Verify:**
- Message arrives on your phone
- **From number** is the masked business number (not owner's real number)
- Message content matches what you sent

### Test 3: Sitter Message Flow

1. **As Owner**: Create a thread and assign to sitter
2. **As Sitter**: Login to `/sitter/inbox`
3. **As Sitter**: Send a message in the thread
4. **Check client's phone**: Client should receive message

**Verify:**
- Client receives message **from** sitter's masked number
- Sitter's real phone number is **not** visible to client
- Client's real phone number is **not** visible to sitter
- Owner can see both real numbers

---

## Part 4: Troubleshooting

### Issue: Numbers Not Appearing

**Check:**
1. Twilio credentials are correct in Render environment variables
2. API service is running: `https://snout-os-api.onrender.com/health`
3. Check browser console for errors
4. Check API logs in Render

### Issue: Messages Not Sending

**Check:**
1. Number status is "Active" (not "Quarantined")
2. Number is assigned to correct class
3. Twilio account has credits
4. Webhook URL is correct: `https://snout-os-api.onrender.com/api/webhooks/twilio`
5. Check Twilio console for delivery errors

### Issue: Masking Not Working

**Check:**
1. `TWILIO_PROXY_SERVICE_SID` is set in Render
2. Proxy Service is configured in Twilio Console
3. Numbers are assigned to Proxy Service in Twilio
4. Check API logs for proxy-related errors

### Issue: Webhook Not Receiving Messages

**Check:**
1. Webhook URL in Twilio Console matches: `https://snout-os-api.onrender.com/api/webhooks/twilio`
2. Webhook is set for both "A MESSAGE COMES IN" and "STATUS CALLBACK"
3. API service is accessible (not sleeping)
4. Check API logs for webhook requests

---

## Quick Test Checklist

- [ ] Can view number inventory
- [ ] Can import a Twilio number
- [ ] Can buy a number (if credits available)
- [ ] Can assign number to sitter
- [ ] Can quarantine/release numbers
- [ ] Inbound messages create threads
- [ ] Outbound messages send successfully
- [ ] Messages show from masked numbers
- [ ] Real phone numbers are hidden from sitters/clients
- [ ] Owner sees all real numbers
- [ ] Sitter can send/receive messages
- [ ] Pool numbers rotate correctly

---

## Next Steps

After testing:
1. Document any issues found
2. Check Twilio console for delivery status
3. Verify webhook logs in API service
4. Test with multiple numbers and classes
5. Test with multiple sitters and clients
