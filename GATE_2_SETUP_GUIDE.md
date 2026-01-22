# Gate 2 Setup Guide

This guide walks you through setting up Twilio Proxy for Gate 2 testing.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Twilio account created
- [ ] Twilio phone number purchased (SMS capable)
- [ ] Twilio Proxy Service created
- [ ] Local development environment running
- [ ] Database migrations applied

## Phase A: Make SnoutOS Ready

### Step A1: Install Dependencies

```bash
npm install
npm install twilio
npm ls twilio  # Verify it's installed
```

### Step A2: Run Database Migrations

```bash
npx prisma migrate deploy  # Production
# OR
npx prisma migrate dev     # Development
npx prisma generate
```

### Step A3: Enable Feature Flag

In your `.env` or `.env.local`:

```bash
ENABLE_MESSAGING_V1=true
```

**Restart your dev server** after changing env vars.

## Phase B: Create Twilio Resources

### Step B1: Buy Twilio Phone Number

1. Log into [Twilio Console](https://console.twilio.com)
2. Go to **Phone Numbers** → **Buy a number**
3. Select SMS-capable number
4. Write down:
   - Phone number in E.164 format: `+1XXXXXXXXXX`
   - Phone Number SID (if shown)

### Step B2: Create Proxy Service

1. In Twilio Console, go to **Proxy**
2. Click **Create a new Service**
3. Write down: `TWILIO_PROXY_SERVICE_SID`

### Step B3: Add Number to Proxy Service

1. Open your Proxy Service
2. Go to **Phone Numbers** tab
3. Click **Add a phone number**
4. Select the number you bought in Step B1
5. **This step is critical** - Proxy will fail without a number in the pool

## Phase C: Set Environment Variables

### Required Variables

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PROXY_SERVICE_SID=KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Phone Number
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX  # The number you bought

# Webhook Configuration
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/messages/webhook/twilio
WEBHOOK_BASE_URL=https://yourdomain.com
PUBLIC_BASE_URL=https://yourdomain.com

# Optional (for webhook signature verification)
TWILIO_WEBHOOK_AUTH_TOKEN=your_webhook_auth_token
```

### Critical: TWILIO_WEBHOOK_URL

**Must match exactly** what Twilio calls:
- Same domain
- Same protocol (https vs http)
- Same path
- Same query params (if any)
- Same trailing slash behavior

Example:
- If Twilio hits: `https://yourdomain.com/api/messages/webhook/twilio`
- Then `TWILIO_WEBHOOK_URL` must be exactly: `https://yourdomain.com/api/messages/webhook/twilio`

## Phase D: Expose Webhook Endpoint

### Option 1: Staging Deployment (Recommended)

1. Deploy to Render/staging
2. Use staging URL as `WEBHOOK_BASE_URL`
3. Set `TWILIO_WEBHOOK_URL` to full webhook path

### Option 2: Local Tunnel (Development)

Using ngrok:

```bash
# Install ngrok
# Then run:
ngrok http 3000
```

Use the ngrok URL:
```bash
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
TWILIO_WEBHOOK_URL=https://abc123.ngrok-free.app/api/messages/webhook/twilio
```

**Restart your Next.js server** after setting env vars.

## Phase E: Configure Twilio Webhook

### Step E1: Set Inbound Messaging Webhook

1. Twilio Console → **Phone Numbers**
2. Click your number
3. Go to **Messaging** section
4. Set **"A message comes in"** to:
   ```
   https://yourdomain.com/api/messages/webhook/twilio
   ```
5. Method: **POST**
6. Save

## Phase F: Verify Endpoints

### Step F1: Open Messages Page

Navigate to: `https://yourdomain.com/messages`

Should show messages UI (if feature flag enabled).

### Step F2: Test Threads Endpoint

```bash
curl https://yourdomain.com/api/messages/threads
```

Should return JSON (even if empty array).

## Phase G: End-to-End SMS Test

### Step G1: Send Outbound

1. In SnoutOS Messages UI
2. Start new thread
3. Enter your phone number
4. Send "test 1"

**Expected:**
- Thread created
- Outbound MessageEvent stored
- `providerSessionSid` set on thread
- Message arrives on your phone

### Step G2: Reply from Phone

Reply: "test reply 1"

**Expected:**
- Twilio calls webhook
- Webhook verifies signature
- Inbound MessageEvent stored
- Reply appears in same thread

### Step G3: Verify Masking

- Your phone should show messages from the Twilio number
- This is the masked number (expected behavior)

## Phase H: Database Verification

Check these tables for your test thread:

### MessageThread
```sql
SELECT id, providerSessionSid, maskedNumberE164, lastInboundAt, lastOutboundAt
FROM "MessageThread"
WHERE id = 'your-thread-id';
```

**Expected:**
- `providerSessionSid` is set (not null)
- `maskedNumberE164` is set
- Timestamps updated

### MessageParticipant
```sql
SELECT id, role, providerParticipantSid, realE164
FROM "MessageParticipant"
WHERE "threadId" = 'your-thread-id';
```

**Expected:**
- Client participant has `providerParticipantSid`
- Owner participant has `providerParticipantSid` (if created)

### MessageEvent
```sql
SELECT id, direction, actorType, "deliveryStatus", "providerMessageSid"
FROM "MessageEvent"
WHERE "threadId" = 'your-thread-id'
ORDER BY "createdAt";
```

**Expected:**
- Both inbound and outbound events exist
- `deliveryStatus` populated
- `providerMessageSid` or `interactionSid` set

## Phase I: Common Failures

### Failure 1: Webhook Signature Verification Fails

**Symptom:** 401 errors on webhook

**Fix:**
1. Check `TWILIO_WEBHOOK_URL` matches exactly what Twilio calls
2. Log the actual request URL in webhook handler
3. Set `TWILIO_WEBHOOK_URL` to match exactly
4. Restart server

### Failure 2: Inbound Texts Never Show

**Symptom:** Messages sent but not appearing in SnoutOS

**Fix:**
1. Check Twilio Console → Message Logs
2. Look for webhook errors
3. Verify webhook URL is reachable
4. If using ngrok, ensure it's still running

### Failure 3: Proxy Errors

**Symptom:** "Proxy service not found" or similar

**Fix:**
1. Verify `TWILIO_PROXY_SERVICE_SID` is set correctly
2. Ensure Proxy Service has at least one number in pool
3. Verify number is attached to Proxy Service

### Failure 4: New Thread Every Time

**Symptom:** Each inbound creates a new thread instead of using existing

**Fix:**
- This is a code issue - thread matching logic needs to use `providerSessionSid` or proxy identifiers
- Check webhook handler thread lookup logic

## Phase J: Next Steps

Once the loop works:

1. **Run tests:**
   ```bash
   npm test
   ```

2. **Verify Gate 2 requirements:**
   - Stable client visible number
   - True masking (no real numbers exposed)
   - Reroute works mid-conversation
   - Snapshot integrity
   - Rollback safety

3. **Prepare for Gate 3:**
   - STOP/START/HELP keywords
   - Quiet hours
   - Rate limits
   - Suppression logging

## What to Provide

After running the setup, provide these 4 things:

1. **Environment status:** Which env vars are set (redact secrets, show keys only)
2. **Twilio Console status:** Proxy Service SID, Phone Number SID, webhook URL configured
3. **First test result:** Did outbound send work? Did inbound reply work?
4. **Database snapshot:** One row each from MessageThread, MessageParticipant, MessageEvent for test thread

With these, I can guide you to the exact fix if anything fails.
