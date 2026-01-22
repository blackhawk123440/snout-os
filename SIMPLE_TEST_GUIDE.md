# Simple Step-by-Step Guide: Test Messaging

## What We're Testing

You're going to test that SnoutOS can:
1. Send messages to a phone
2. Receive replies from that phone
3. Store everything in the database

## Step 1: Fix Database (if needed)

First, let's make sure your database works:

```bash
# Check if you can connect
cd "/Users/leahhudson/Desktop/final form/snout-os"
npx prisma db push
```

If you get an auth error, you might need to update your `DATABASE_URL` in `.env.local`.

## Step 2: Set Up Webhook URL (for receiving messages)

You need a public URL so Twilio can send messages to your app.

### Option A: Use ngrok (easiest for testing)

1. **Install ngrok** (if you don't have it):
   ```bash
   brew install ngrok
   # OR download from: https://ngrok.com/download
   ```

2. **Run ngrok in a new terminal window:**
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** it gives you (looks like `https://abc123.ngrok-free.app`)

4. **Add to `.env.local`:**
   ```bash
   TWILIO_WEBHOOK_URL=https://abc123.ngrok-free.app/api/messages/webhook/twilio
   WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
   ```

5. **Restart your dev server:**
   - Stop it (Ctrl+C in the terminal where it's running)
   - Start it again: `npm run dev`

### Option B: Use your production URL (if deployed)

If you have a deployed URL (like Render, Vercel, etc.), use that instead.

## Step 3: Configure Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your phone number: **+12562039373**
3. Scroll down to **"Messaging"** section
4. Find **"A message comes in"** field
5. Enter your webhook URL (from Step 2):
   ```
   https://abc123.ngrok-free.app/api/messages/webhook/twilio
   ```
   (Replace with your actual ngrok URL)
6. Set **HTTP method** to: **POST**
7. Click **Save**

## Step 4: Test Sending a Message

1. **Open your app:** http://localhost:3000/messages
   (You should see the messaging UI)

2. **Start a new conversation:**
   - Enter YOUR personal phone number (the one you have with you)
   - Type a test message like "Hello from SnoutOS"
   - Click Send

3. **Check your phone:** You should receive the message!

## Step 5: Test Receiving a Reply

1. **Reply from your phone** to the message you just received
   - Reply with: "Test reply 1"

2. **Check SnoutOS:** 
   - Go back to http://localhost:3000/messages
   - Your reply should appear in the same conversation

## What Should Happen

✅ **Outbound (Step 4):**
- Message sent from SnoutOS → Your phone
- Message stored in database as "outbound"
- Thread created with `providerSessionSid`

✅ **Inbound (Step 5):**
- You reply from phone → Twilio receives it
- Twilio calls your webhook
- Message stored in database as "inbound"
- Reply appears in same thread

## Troubleshooting

### "Messages page not showing"
- Make sure `ENABLE_MESSAGING_V1=true` in `.env.local`
- Restart dev server

### "Webhook not receiving messages"
- Check ngrok is still running
- Verify webhook URL in Twilio Console matches your ngrok URL exactly
- Check Twilio Console → Monitor → Logs for errors

### "Database errors"
- Verify `DATABASE_URL` in `.env.local` is correct
- Try: `npx prisma db push`

## Need Help?

If something fails:
1. Check the terminal where your dev server is running (look for errors)
2. Check ngrok terminal (make sure it's still running)
3. Check Twilio Console → Monitor → Logs (look for webhook calls)
