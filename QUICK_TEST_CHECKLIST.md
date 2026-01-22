# Quick Test Checklist - Answer These 3 Questions

## Test Setup
1. ✅ Server running: http://localhost:3000
2. ✅ ngrok running: https://mitsue-unblundering-cooper.ngrok-free.dev
3. ✅ Environment variables set in `.env.local`

## Critical: Proxy Service Webhook Configuration

**Important:** When using Proxy Service, you need to configure the **Proxy Service's callback URL**, not just the phone number webhook.

1. Go to: https://console.twilio.com/us1/develop/proxy/services
2. Click on your Proxy Service (starts with `KS...`)
3. Find **"Callback URL"** or **"Webhook URL"** setting
4. Set it to: `https://mitsue-unblundering-cooper.ngrok-free.dev/api/messages/webhook/twilio`
5. Save

## Test Steps

### Step 1: Send Outbound Message
1. Open: http://localhost:3000/messages
2. Start new conversation
3. Enter YOUR personal phone number
4. Type: **"Test 1"**
5. Click Send

### Step 2: Check Your Phone
**Question 1: Did you receive the outbound text on your phone?**
- [ ] Yes
- [ ] No

### Step 3: Reply from Phone
Reply to the message with: **"Test reply 1"**

### Step 4: Check ngrok Inspector
Open: http://127.0.0.1:4040

**Question 2: Do you see a POST request when you reply?**
- [ ] Yes - I see a POST to `/api/messages/webhook/twilio`
- [ ] No - Nothing appears in ngrok

### Step 5: Check SnoutOS Messages Page
Go back to: http://localhost:3000/messages

**Question 3: Did your reply show up in SnoutOS?**
- [ ] Yes - I can see "Test reply 1" in the conversation
- [ ] No - The reply is not there

## If Something Fails

### If Question 1 is NO (didn't receive outbound):
- Check server terminal for errors
- Verify `TWILIO_PHONE_NUMBER` and `TWILIO_PROXY_SERVICE_SID` in `.env.local`
- Check Twilio Console → Monitor → Logs

### If Question 2 is NO (no POST in ngrok):
- **Check Proxy Service callback URL** is set correctly
- Verify ngrok is still running
- Check Proxy Service has your phone number added

### If Question 3 is NO (reply didn't appear):
- Check server terminal for errors
- Check ngrok inspector for webhook response (should be 200)
- Check browser console for errors
- Verify webhook handler is working

## Answer Format

Just tell me:
1. Did you receive the outbound text? **Yes/No**
2. Do you see a POST request in ngrok? **Yes/No**
3. Did your reply show up? **Yes/No**

And I'll help debug the exact issue!
