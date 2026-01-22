# Deployment Checklist

## Pre-Deployment Verification

### 1. Build Success
```bash
npm run build
```
**Status**: ✅ PASSED

### 2. TypeScript Check
```bash
npm run typecheck
```
**Status**: ✅ PASSED (seed script fixed)

### 3. Prisma Client Generated
```bash
npx prisma generate
```
**Status**: ✅ PASSED

### 4. Environment Variables Required

**Staging/Production**:
```bash
ENABLE_MESSAGING_V1=true
ENABLE_PROACTIVE_THREAD_CREATION=false  # Enable after Step 2 verification
ENABLE_SITTER_MESSAGES_V1=false  # Enable after Step 3 verification
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PROXY_SERVICE_SID=KS...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WEBHOOK_URL=https://<deployment-url>/api/messages/webhook/twilio
WEBHOOK_BASE_URL=https://<deployment-url>
PUBLIC_BASE_URL=https://<deployment-url>
DATABASE_URL=postgresql://...
```

### 5. Database Migration

**Option A: Use db push (current approach)**
```bash
npx prisma db push
```

**Option B: Generate migration (recommended for production)**
```bash
npx prisma migrate dev --name add_messaging_models
npx prisma migrate deploy
```

### 6. Build Command (Render/Vercel)

```bash
prisma generate --schema=prisma/schema.prisma && next build
```

**With migrations**:
```bash
prisma generate --schema=prisma/schema.prisma && prisma migrate deploy --schema=prisma/schema.prisma && next build
```

### 7. Start Command

```bash
next start
```

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://<deployment-url>/api/messages/diagnostics
```

**Expected**: JSON with `featureFlags.ENABLE_MESSAGING_V1: true`

### 2. Messages Page
- Navigate to: `https://<deployment-url>/messages`
- Should show conversations tab (if flag enabled)
- Should not show errors in browser console

### 3. Twilio Webhook Configuration
1. Go to Twilio Console → Phone Numbers
2. Click your number
3. Set "A message comes in" to: `https://<deployment-url>/api/messages/webhook/twilio`
4. Method: POST
5. Save

## Known Issues Fixed

1. ✅ Seed script field names corrected:
   - `isActive` → `status: 'active'`
   - `content` → `body`
   - `providerMessageId` → `providerMessageSid`
   - `providerStatus` → `deliveryStatus`
   - Participant creation requires `threadId` (thread created first)

2. ✅ Build errors resolved
3. ✅ TypeScript errors resolved
4. ✅ Prisma client regenerated

## Deployment Notes

- All code changes committed
- Build passes successfully
- TypeScript compilation passes
- Seed script works for local testing
- No breaking changes to existing routes
