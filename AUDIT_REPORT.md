# System Audit Report - Sitter Messaging + Offer + Tier + Calendar

**Date**: 2025-01-XX  
**Purpose**: Verify existing implementations before making changes

---

## 1) MESSAGING SYSTEM

### ✅ CANONICAL MODELS (EXIST)
- **MessageThread**: `prisma/schema.prisma` line 1097
  - Fields: `assignedSitterId`, `scope`, `bookingId`, `clientId`, `maskedNumberE164`
  - No `mailboxOwnerType`/`mailboxOwnerId` fields (derived from existing fields)
  
- **MessageEvent**: `prisma/schema.prisma` line 1173
  - Fields: `threadId`, `direction`, `actorType`, `body`, `providerMessageSid`
  - Supports inbound/outbound tracking

- **MessageResponseLink**: `prisma/schema.prisma` line 1564
  - Tracks response times for tier metrics

### ✅ MAILBOX OWNERSHIP (IMPLEMENTED)
- **Location**: `src/lib/messaging/mailbox-helpers.ts`
- **Functions**: `getMailboxType()`, `isSitterMailbox()`, `isOwnerMailbox()`
- **Rule**: 
  - Sitter mailbox: `assignedSitterId IS NOT NULL` AND `scope IN ('client_booking', 'client_general')`
  - Owner mailbox: `scope = 'internal'` OR (`assignedSitterId IS NULL` AND `scope = 'owner_sitter'`)

### ✅ SITTER INBOX FILTERING (ENFORCED)
- **Endpoint**: `src/app/api/sitters/[id]/messages/route.ts` line 52-56
- **Filter**: `scope: { in: ['client_booking', 'client_general'] }` ✅
- **Owner inbox exclusion**: `src/app/api/messages/threads/route.ts` line 128-133
  - Excludes sitter mailbox threads when `scope='internal'` or `inbox='owner'` ✅

**STATUS**: ✅ COMPLETE - No changes needed

---

## 2) TWILIO INTEGRATION

### ✅ WEBHOOK ENDPOINT (EXISTS)
- **Location**: `src/app/api/twilio/inbound/route.ts`
- **Route**: `POST /api/twilio/inbound` ✅

### ✅ SIGNATURE VERIFICATION (IMPLEMENTED)
- **Location**: `src/app/api/twilio/inbound/route.ts` line 357-364
- **Uses**: `TwilioProvider.verifyWebhook()` from `src/lib/messaging/providers/twilio.ts` ✅
- **Webhook URL**: Constructs from `TWILIO_WEBHOOK_URL` env var or request origin ✅

### ✅ NUMBER → SITTER RESOLUTION (IMPLEMENTED)
- **Location**: `src/lib/messaging/number-sitter-mapping.ts`
- **Functions**: 
  - `getSitterIdFromNumber()` - Maps via `MessageNumber.assignedSitterId` ✅
  - `getSitterIdFromMaskedNumber()` - Fallback via `SitterMaskedNumber` ✅
- **Used in webhook**: Line 382 ✅

### ✅ INBOUND MESSAGE PERSISTENCE (IMPLEMENTED)
- **Location**: `src/app/api/twilio/inbound/route.ts` line 590-602
- **Persists to**: `MessageEvent` model ✅
- **Fields**: `threadId`, `direction='inbound'`, `actorType='client'`, `providerMessageSid`, `body` ✅
- **Thread routing**: Routes to correct `MessageThread` based on number class and client ✅

**STATUS**: ✅ COMPLETE - No changes needed

---

## 3) YES/NO SMS COMMANDS

### ✅ COMMAND PARSER (EXISTS)
- **Location**: `src/lib/messaging/sms-commands.ts`
- **Functions**: `isAcceptCommand()`, `isDeclineCommand()` ✅
- **Commands**: YES/Y/ACCEPT, NO/N/DECLINE ✅

### ✅ COMMAND HANDLERS (IMPLEMENTED)
- **Location**: `src/app/api/twilio/inbound/route.ts`
- **Functions**: 
  - `handleAcceptCommand()` - Lines 41-156 ✅
  - `handleDeclineCommand()` - Lines 161-254 ✅
- **Integration**: Lines 384-417 (YES), 420-453 (NO) ✅

### ✅ REUSES EXISTING LOGIC (VERIFIED)
- **Accepts**: Updates `OfferEvent.status='accepted'`, assigns booking, records audit ✅
- **Declines**: Updates `OfferEvent.status='declined'`, records audit ✅
- **Idempotent**: Checks existing state before applying (lines 81-93, 198-212) ✅
- **Metrics**: Updates `SitterMetricsWindow` (lines 147, 247) ✅

### ✅ AUDIT EVENTS (RECORDED)
- **Location**: `src/app/api/twilio/inbound/route.ts` lines 129-143, 228-243
- **Events**: `offer.accepted`, `offer.declined` with `source='sms'` ✅
- **Helper**: Uses `recordSitterAuditEvent()` from `src/lib/audit-events.ts` ✅

### ✅ SMS CONFIRMATION (IMPLEMENTED)
- **Location**: `src/app/api/twilio/inbound/route.ts` lines 417, 452
- **Returns**: TwiML response via `twimlResponse()` ✅

**STATUS**: ✅ COMPLETE - No changes needed

---

## 4) TIER SYSTEM

### ✅ TIER ENGINE (EXISTS - NOT DUPLICATED)
- **Location**: `src/lib/tiers/tier-engine-twilio.ts`
- **Function**: `computeTierForSitter()` ✅
- **No duplicates**: Only one tier engine file found ✅

### ✅ TIER METRICS SOURCES (CONNECTED)
- **Offer response times**: 
  - Source: `OfferEvent.offeredAt` → `acceptedAt`/`declinedAt` ✅
  - Used in: `tier-engine-twilio.ts` lines 137-149 ✅
  
- **Messaging response times**:
  - Source: `MessageResponseLink.responseSeconds` ✅
  - Created by: `processMessageEvent()` in `src/lib/tiers/message-instrumentation.ts` ✅
  - Used in: `tier-engine-twilio.ts` lines 92-104 ✅
  - **Webhook integration**: `src/app/api/twilio/inbound/route.ts` lines 605-620 ✅

### ✅ METRICS WINDOW (EXISTS)
- **Model**: `SitterMetricsWindow` in `prisma/schema.prisma` line 1538
- **Fields**: `avgResponseSeconds`, `medianResponseSeconds`, `responseRate`, `offerAcceptRate`, etc. ✅
- **Updated by**: Accept/decline endpoints and SMS handlers ✅

**STATUS**: ✅ COMPLETE - No changes needed

---

## 5) CALENDAR INTEGRATION

### ✅ SCHEMA FIELDS (EXIST)
- **Sitter model**: `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry`, `googleCalendarId`, `calendarSyncEnabled` ✅
- **BookingCalendarEvent model**: `prisma/schema.prisma` line 1593 ✅
- **Relations**: `Sitter.calendarEvents`, `Booking.calendarEvents` ✅

### ✅ CALENDAR SYNC HELPER (EXISTS)
- **Location**: `src/lib/calendar-sync.ts`
- **Functions**: `syncBookingToCalendar()`, `removeBookingFromCalendar()` ✅
- **Uses**: `google-calendar.ts` for API calls ✅

### ❌ NOT HOOKED TO ACCEPT/ASSIGN (MISSING)
- **Accept endpoint**: `src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts`
  - **Status**: No calendar sync call found ❌
  - **Line 109**: Booking assigned but no `syncBookingToCalendar()` call
  
- **SMS accept handler**: `src/app/api/twilio/inbound/route.ts` `handleAcceptCommand()`
  - **Status**: No calendar sync call found ❌
  - **Line 120**: Booking assigned but no `syncBookingToCalendar()` call

- **Force assign endpoint**: `src/app/api/dispatch/force-assign/route.ts`
  - **Status**: No calendar sync call found ❌
  - **Calls**: `forceAssignSitter()` from `dispatch-control.ts` which assigns booking but doesn't sync calendar

### ❌ CALENDAR TAB (MISSING)
- **Sitter page**: `src/app/sitters/[id]/page.tsx`
  - **Status**: No Calendar tab found ❌
- **Components**: `src/components/sitter/` - No `SitterCalendarTab.tsx` found ❌

**STATUS**: ❌ INCOMPLETE - Calendar sync not triggered, Calendar tab missing

---

## 6) BOOKING FORM

### ✅ BOOKING FORM COMPONENT (EXISTS)
- **Location**: `src/components/bookings/BookingForm.tsx`
- **Features**: Create/edit modes, validation, uses `booking-form-mapper` ✅

### ✅ NEW BOOKING ROUTE (EXISTS - NEEDS VERIFICATION)
- **Location**: `src/app/bookings/new/page.tsx` ✅
- **Status**: File exists - need to verify if it uses `BookingForm` component ❓

**STATUS**: ❓ NEEDS VERIFICATION - Check if uses BookingForm

---

## SUMMARY

### ✅ COMPLETE (No Changes Needed)
1. **Messaging System**: Models, mailbox separation, sitter inbox filtering ✅
2. **Twilio Integration**: Webhook endpoint, signature verification, number resolution, message persistence ✅
3. **YES/NO Commands**: Parser, handlers, audit events, SMS confirmation ✅
4. **Tier System**: Engine exists (not duplicated), metrics connected ✅

### ❌ MISSING (Requires Implementation)
1. **Calendar Sync Hooks**: 
   - Not called in accept endpoint (`src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts`)
   - Not called in SMS accept handler (`src/app/api/twilio/inbound/route.ts` `handleAcceptCommand()`)
   - Not called in force-assign (`src/lib/dispatch-control.ts` `forceAssignSitter()`)
   
2. **Calendar Tab**:
   - No Calendar tab in sitter page (`src/app/sitters/[id]/page.tsx` - tabs array line 289-296)
   - No `SitterCalendarTab` component in `src/components/sitter/`

---

## FILES TO VERIFY/CHANGE

### Missing Implementations:
1. `src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts` - Add calendar sync call
2. `src/app/api/twilio/inbound/route.ts` - Add calendar sync call in `handleAcceptCommand()`
3. `src/app/api/dispatch/force-assign/route.ts` - Verify/add calendar sync call
4. `src/components/sitter/SitterCalendarTab.tsx` - CREATE (new component)
5. `src/app/sitters/[id]/page.tsx` - Add Calendar tab

### ✅ Verified Complete:
1. `src/app/bookings/new/page.tsx` - ✅ Uses `BookingForm` component (lines 13, 80, 102)
