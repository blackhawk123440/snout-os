# Proof Commands

**Purpose**: Exact commands to verify system health and feature completeness

---

## Local Development Verification

### Type Checking
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run typecheck
```
**Expected**: No TypeScript errors  
**Evidence File**: `audit/logs/typecheck.log` (if exists)

---

### Build Verification
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run build
```
**Expected**: Successful build with no errors  
**Evidence File**: `audit/logs/build.log` (if exists)

---

### Test Suite
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run test
```
**Expected**: All tests pass  
**Evidence File**: `audit/logs/test_all.log` (if exists)

---

### Health Endpoint (Local)
```bash
curl http://localhost:3000/api/health
```
**Expected**: JSON response with status "ok" or "degraded", services status  
**Verify**:
- `services.database`: "ok"
- `services.redis`: "ok" or "error" (acceptable if Redis not running)
- `services.queue`: "ok" or "error" (acceptable if queue not running)
- `auth.flags.enableAuthProtection`: boolean
- `auth.flags.enableSitterAuth`: boolean
- `auth.flags.enablePermissionChecks`: boolean
- `auth.flags.enableWebhookValidation`: boolean

---

### Feature Flag Status (Local)
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
grep -r "ENABLE_" .env.local .env 2>/dev/null | grep -v node_modules
```
**Expected**: All flags default to false or unset  
**Verify**:
- `ENABLE_FORM_MAPPER_V1=false` or unset
- `ENABLE_AUTH_PROTECTION=false` or unset
- `ENABLE_SITTER_AUTH=false` or unset
- `ENABLE_PERMISSION_CHECKS=false` or unset
- `ENABLE_WEBHOOK_VALIDATION=false` or unset

---

## Production/Staging Verification (Render)

### Health Endpoint (Production)
```bash
curl https://your-production-url.onrender.com/api/health
```
**Expected**: Same as local, but verify production-specific values

---

### Health Endpoint (Staging)
```bash
curl https://your-staging-url.onrender.com/api/health
```
**Expected**: Same as local, verify staging-specific values

---

### Feature Flag Status (Render)
**Via Render Dashboard**:
1. Navigate to service settings
2. Check Environment variables
3. Verify all `ENABLE_*` flags are set correctly

**Via CLI** (if Render CLI installed):
```bash
render env list --service your-service-name
```

---

## Proof Scripts

### Phase 1 Verification Script
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
BASE_URL=https://your-staging-url.onrender.com npx tsx scripts/phase1-staging-verification.ts
```
**Expected**: Script submits 5 test bookings and verifies mapping  
**Evidence**: Check script output for booking IDs

---

### Phase A Proof Script
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run proof:phaseA
```
**Expected**: Verification of Phase A features  
**Evidence**: Check script output

---

## Database Verification

### Prisma Studio (Local)
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npm run db:studio
```
**Verify**:
- Booking records exist
- EventLog entries exist
- Settings persisted correctly
- Status history records exist

---

### Schema Validation
```bash
cd "/Users/leahhudson/Desktop/final form/snout-os"
npx prisma validate
```
**Expected**: Schema is valid

---

## API Route Verification

### Bookings List
```bash
curl http://localhost:3000/api/bookings
```
**Expected**: JSON array of bookings with all required fields

---

### Booking Detail
```bash
curl http://localhost:3000/api/bookings/[BOOKING_ID]
```
**Expected**: Single booking object with pets, sitter, timeSlots

---

### Status History
```bash
curl http://localhost:3000/api/bookings/[BOOKING_ID]/status-history
```
**Expected**: Array of status history entries

---

### Automation Ledger
```bash
curl http://localhost:3000/api/automations/ledger
```
**Expected**: Array of automation runs with filters

---

### Exceptions
```bash
curl http://localhost:3000/api/exceptions
```
**Expected**: Array of exceptions (unpaid, unassigned, drift, automation failures)

---

### Settings Persistence
```bash
# Get settings
curl http://localhost:3000/api/settings

# Update automation settings
curl -X PATCH http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"automation":{"bookingConfirmation":{"enabled":true}}}'

# Verify persistence (re-read)
curl http://localhost:3000/api/settings
```
**Expected**: Settings persist and return canonical value from DB

---

## Integration Verification

### Stripe Integration Test
```bash
curl http://localhost:3000/api/integrations/test/stripe
```
**Expected**: Stripe connection status

---

### OpenPhone Integration Test
```bash
curl http://localhost:3000/api/integrations/test/openphone
```
**Expected**: OpenPhone connection status

---

### Database Connection Test
```bash
curl http://localhost:3000/api/integrations/test/database
```
**Expected**: Database connection status

---

## Authentication Verification

### Login Page
```bash
curl http://localhost:3000/login
```
**Expected**: Login page HTML (200 status)

---

### Protected Route (with flag OFF)
```bash
curl http://localhost:3000/bookings
```
**Expected**: Bookings page accessible (ENABLE_AUTH_PROTECTION=false)

---

### Protected Route (with flag ON)
```bash
# Set ENABLE_AUTH_PROTECTION=true in .env
# Restart server
curl http://localhost:3000/bookings
```
**Expected**: Redirect to `/login?callbackUrl=/bookings` (ENABLE_AUTH_PROTECTION=true)

---

## Form Submission Verification

### Form Endpoint (Public)
```bash
curl -X POST http://localhost:3000/api/form \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","phone":"1234567890","service":"Dog Walking","startAt":"2025-02-01T10:00:00Z","endAt":"2025-02-01T11:00:00Z","pets":[{"name":"Fido","species":"Dog"}]}'
```
**Expected**: Booking created successfully (200 status)

---

## Pricing Engine Verification

### Pricing Calculation (with flag OFF)
```bash
# ENABLE_FORM_MAPPER_V1=false, USE_PRICING_ENGINE_V1=false
# Submit booking via form
# Check booking.totalPrice matches expected calculation
```

### Pricing Calculation (with flag ON)
```bash
# USE_PRICING_ENGINE_V1=true
# Submit booking via form
# Check booking.pricingSnapshot exists
# Verify pricing matches canonical breakdown
```

---

## Automation Verification

### Automation Settings Persistence
```bash
# 1. Update automation settings via UI or API
# 2. Check database: SELECT * FROM Setting WHERE key = 'automation';
# 3. Verify JSON value matches what was saved
# 4. Re-read via API and verify checksum matches
```

### Automation Ledger
```bash
curl http://localhost:3000/api/automations/ledger?status=failed
```
**Expected**: Failed automation runs (if any)

---

## Calendar Verification

### Calendar Month View
```bash
curl http://localhost:3000/calendar
```
**Expected**: Calendar page loads with bookings

### Calendar Agenda View
```bash
# Navigate to calendar page
# Click "Agenda" view toggle
# Verify agenda view displays
```

---

## Sitter Dashboard Verification

### Sitter Bookings (Scoped)
```bash
curl http://localhost:3000/api/sitter/[SITTER_ID]/bookings
```
**Expected**: Only bookings for that sitter

### Sitter Restrictions (with flag ON)
```bash
# ENABLE_SITTER_AUTH=true
# Authenticate as sitter
# Try to access /payments
```
**Expected**: 403 Forbidden (sitter cannot access payments)

---

## Session Management Verification

### Session Inventory
```bash
curl http://localhost:3000/api/sessions
```
**Expected**: Array of active sessions for current user

### Session Revoke
```bash
curl -X DELETE "http://localhost:3000/api/sessions?sessionId=[SESSION_ID]"
```
**Expected**: Session revoked, EventLog entry created

---

## EventLog Verification

### EventLog Query
```bash
# Via Prisma Studio or direct DB query:
SELECT * FROM EventLog WHERE eventType = 'automation.run' ORDER BY createdAt DESC LIMIT 10;
```
**Expected**: Automation run entries with status, metadata

---

## Notes

- All commands assume local development server running on port 3000
- Replace `[BOOKING_ID]`, `[SITTER_ID]`, `[SESSION_ID]` with actual IDs
- Replace `your-production-url` and `your-staging-url` with actual URLs
- Some commands require authentication (add `Authorization` header if needed)
- Database commands require database access credentials

