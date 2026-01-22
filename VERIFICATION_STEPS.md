# End-to-End Verification Steps

## Step 0: Confirm Build and Runtime

```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
git rev-parse HEAD
git status
node -v
npm -v
```

**Environment file loaded**: `.env.local` (Next.js loads this automatically)

## Step 1: Check Runtime Config

```bash
# Start dev server if not running
npm run dev

# In another terminal, check diagnostics
curl http://localhost:3000/api/messages/diagnostics | jq .
```

**Expected output**:
- `featureFlags.ENABLE_MESSAGING_V1: true`
- `runtimeConfig.providerSelected: "TwilioProvider"`
- `runtimeConfig.TWILIO_PHONE_NUMBER: "+1***39373"` (redacted)

## Step 2: Verify Messages Page Uses New APIs

1. Open browser: http://localhost:3000/messages
2. Open browser console (F12)
3. Refresh page
4. Check console logs for:
   - `[ConversationList] Fetching threads from: /api/messages/threads?...`
5. Check server terminal for:
   - `[api/messages/threads] GET request received`
   - `[api/messages/threads] User authenticated: <user-id>`

## Step 3: Seed Test Data

```bash
npx tsx scripts/seed-messaging-thread.ts
```

**Expected output**:
- Thread ID created
- Client phone: +15551234567
- Inbound and outbound messages created

Then refresh `/messages` page and verify thread appears.

## Step 4: Test Send Message

1. Click on seeded thread
2. Type a message
3. Click Send
4. Check browser console for:
   - `[ConversationView] Sending message to: /api/messages/send`
5. Check server terminal for:
   - `[api/messages/send] POST request received`
   - `[api/messages/send] User authenticated: <user-id>`

## Step 5: Verify Twilio Webhook

1. Ensure ngrok is running: `ngrok http 3000`
2. Check ngrok URL matches `.env.local`:
   - `TWILIO_WEBHOOK_URL=https://<ngrok-url>/api/messages/webhook/twilio`
3. Send SMS to your Twilio number from your phone
4. Check server terminal for:
   - `[webhook/twilio] Inbound message received`
5. Check ngrok inspector: http://127.0.0.1:4040
   - Should show POST to `/api/messages/webhook/twilio`
6. Refresh `/messages` page - new message should appear

## Troubleshooting

### Messages page shows nothing
- Check browser console for errors
- Check server logs for API calls
- Verify `ENABLE_MESSAGING_V1=true` in `.env.local`
- Run seed script to create test data

### API returns 404
- Check feature flag is enabled
- Restart dev server after changing `.env.local`

### API returns 401
- Check authentication is working
- Verify user is logged in

### Twilio webhook not receiving
- Verify ngrok URL matches Twilio console webhook URL exactly
- Check ngrok is still running
- Verify `TWILIO_WEBHOOK_URL` in `.env.local` matches ngrok URL
