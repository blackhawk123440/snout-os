# Messaging Environment Variables Template

Add these variables to your `.env` or `.env.local` file when enabling messaging features.

## Feature Flags (all default to false - zero-risk deployment)

```bash
ENABLE_MESSAGING_V1=false
ENABLE_PROACTIVE_THREAD_CREATION=false
ENABLE_SITTER_MESSAGES_V1=false
```

## Twilio Configuration (required when ENABLE_MESSAGING_V1 is true)

```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"

# Optional: For webhook signature verification
TWILIO_WEBHOOK_AUTH_TOKEN="your_webhook_auth_token_here"

# Phone Number (your Twilio number)
TWILIO_PHONE_NUMBER="+1XXXXXXXXXX"

# Twilio Services
TWILIO_MESSAGING_SERVICE_SID="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Optional
TWILIO_PROXY_SERVICE_SID="KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"        # Required for Gate 2+

# Webhook Configuration
TWILIO_WEBHOOK_URL="https://yourdomain.com/api/messages/webhook/twilio"
WEBHOOK_BASE_URL="https://yourdomain.com"
PUBLIC_BASE_URL="https://yourdomain.com"
```

## Messaging Auto-Response Configuration (optional)

```bash
# Booking link for auto-responses
MESSAGING_BOOKING_LINK="https://yourdomain.com/book"

# Custom pool mismatch auto-response (optional)
MESSAGING_POOL_MISMATCH_AUTO_RESPONSE="Thank you for reaching out. Please book a new appointment at: https://yourdomain.com/book"
```

## Setup Instructions

1. **Get Twilio Credentials**: Log into [Twilio Console](https://console.twilio.com)
   - Account SID: Found in dashboard
   - Auth Token: Found in dashboard (click to reveal)
   - Proxy Service SID: Create in Proxy section

2. **Buy Phone Number**: 
   - Go to Phone Numbers → Buy a number
   - Select SMS-capable number
   - Add to Proxy Service (Gate 2+)

3. **Set Webhook URL**:
   - For local dev: Use ngrok (see `GATE_2_SETUP_GUIDE.md`)
   - For staging: Use staging deployment URL
   - For production: Use production URL

4. **Configure Twilio Console**:
   - Phone Number → Messaging → "A message comes in" → Set to `TWILIO_WEBHOOK_URL`
   - Proxy Service → Callback URL → Set to `TWILIO_WEBHOOK_URL` (Gate 2+)

## See Also

- `GATE_2_SETUP_GUIDE.md` - Complete Twilio setup walkthrough
- `ROLLOUT_PHASE_1.md` - Deployment and rollout steps
- `MESSAGING_MIGRATION_NOTES.md` - Database migration guidance
