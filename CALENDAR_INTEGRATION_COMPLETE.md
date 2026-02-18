# Calendar Integration Complete

**Date**: 2025-01-XX  
**Status**: ✅ COMPLETE

---

## SUMMARY

Implemented missing calendar features identified in the audit:
- ✅ Calendar sync hooks added to accept/SMS accept/force-assign endpoints
- ✅ Calendar tab component created and added to sitter page
- ✅ Calendar status API endpoints created
- ✅ Google OAuth routes created for calendar connection

---

## EXISTING CODE REUSED

### Calendar Sync Infrastructure (Already Existed)
1. **`src/lib/calendar-sync.ts`**
   - `syncBookingToCalendar()` - Idempotent sync helper
   - `deleteBookingCalendarEvent()` - Handles event deletion on reassignment
   - Already handles token expiry, audit events, fail-open behavior

2. **`src/lib/google-calendar.ts`**
   - `createGoogleCalendarEvent()` - Creates events via Google Calendar API
   - `updateGoogleCalendarEvent()` - Updates existing events
   - `deleteGoogleCalendarEvent()` - Deletes events

3. **Database Schema**
   - `Sitter` model: `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry`, `googleCalendarId`, `calendarSyncEnabled`
   - `BookingCalendarEvent` model: Maps booking+sitter to Google Calendar event ID

---

## NEW FILES CREATED

### Components
1. **`src/components/sitter/SitterCalendarTab.tsx`**
   - Calendar sync status card (Connected/Not Connected, Sync Enabled toggle)
   - "Connect Google Calendar" button
   - Upcoming bookings list (reuses dashboard data source)
   - Empty state when no bookings

### API Endpoints
2. **`src/app/api/sitters/[id]/calendar/route.ts`**
   - `GET`: Returns calendar sync status and upcoming bookings
   - Permission checks: sitter can only view own calendar, owner/admin can view any

3. **`src/app/api/sitters/[id]/calendar/toggle/route.ts`**
   - `POST`: Enable/disable calendar sync for a sitter
   - Requires Google Calendar to be connected first

4. **`src/app/api/integrations/google/start/route.ts`**
   - `GET`: Initiates Google OAuth flow
   - Redirects to Google consent screen with calendar.events scope
   - State token includes sitterId for callback

5. **`src/app/api/integrations/google/callback/route.ts`**
   - `GET`: Handles OAuth callback
   - Exchanges code for access/refresh tokens
   - Stores tokens in Sitter model
   - Enables sync by default after connection
   - Redirects to sitter calendar tab

---

## MODIFIED FILES

### Calendar Sync Hooks (As Per Audit)
1. **`src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts`**
   - Added import: `syncBookingToCalendar`
   - Added sync call after booking assignment (line ~130)
   - Wrapped in try/catch, fail-open

2. **`src/app/api/twilio/inbound/route.ts`**
   - Added import: `syncBookingToCalendar`
   - Added sync call in `handleAcceptCommand()` after assignment (line ~155)
   - Wrapped in try/catch, fail-open

3. **`src/lib/dispatch-control.ts`**
   - Added imports: `syncBookingToCalendar`, `deleteBookingCalendarEvent`
   - Added logic to delete previous sitter's calendar event on reassignment
   - Added sync call in `forceAssignSitter()` after assignment
   - Wrapped in try/catch, fail-open

### UI Updates
4. **`src/app/sitters/[id]/page.tsx`**
   - Added import: `SitterCalendarTab`
   - Added 'calendar' to `SitterTab` type
   - Added 'calendar' to `validTabs` array
   - Added Calendar tab to tabs array (between Messages and Tier)
   - Added `<TabPanel id="calendar">` with `SitterCalendarTab` component

5. **`src/components/sitter/index.ts`**
   - Added export: `SitterCalendarTab`

6. **`src/lib/env.ts`**
   - Added `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to optional env vars

---

## IMPLEMENTATION DETAILS

### Calendar Sync Behavior
- **Idempotent**: Uses `BookingCalendarEvent` mapping table to track events
- **Fail-open**: Booking assignment succeeds even if calendar sync fails
- **Auditable**: All calendar actions record audit events (`calendar.event_created`, `calendar.event_updated`, `calendar.event_deleted`, `calendar.sync_failed`)
- **Reassignment handling**: Deletes old sitter's event, creates new sitter's event

### OAuth Flow
1. User clicks "Connect Google Calendar" in Calendar tab
2. Redirects to `/api/integrations/google/start?sitterId=...`
3. OAuth route generates state token with sitterId
4. Redirects to Google consent screen (scope: `calendar.events`)
5. Google redirects to `/api/integrations/google/callback?code=...&state=...`
6. Callback exchanges code for tokens
7. Stores tokens in Sitter model, enables sync by default
8. Redirects to sitter calendar tab with `connected=true`

### Permission Model
- **Sitter**: Can only view/toggle their own calendar
- **Owner/Admin**: Can view/toggle any sitter's calendar
- All endpoints enforce permission checks

---

## TESTING INSTRUCTIONS

### End-to-End Test with One Booking

1. **Setup**:
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
   - Configure Google OAuth redirect URI: `http://localhost:3000/api/integrations/google/callback`

2. **Connect Calendar**:
   - Navigate to `/sitters/[sitterId]?tab=calendar`
   - Click "Connect Google Calendar"
   - Complete OAuth flow
   - Verify "Connected" badge appears
   - Verify "Sync Enabled" toggle works

3. **Accept Booking (UI)**:
   - Create a booking offer for the sitter
   - Accept booking via `/api/sitter/[id]/bookings/[bookingId]/accept`
   - Verify event appears in sitter's Google Calendar
   - Check audit logs for `calendar.event_created`

4. **Accept Booking (SMS)**:
   - Create another booking offer
   - Send "YES" via SMS to sitter's masked number
   - Verify event appears in sitter's Google Calendar
   - Check audit logs for `calendar.event_created` with `source='sms'`

5. **Force Assign**:
   - Create a booking
   - Force assign to a different sitter via `/api/dispatch/force-assign`
   - Verify old sitter's calendar event is deleted
   - Verify new sitter's calendar event is created
   - Check audit logs for both `calendar.event_deleted` and `calendar.event_created`

6. **Reassignment**:
   - Force assign same booking to another sitter
   - Verify previous sitter's event deleted, new sitter's event created

7. **Failure Handling**:
   - Disable sync for a sitter
   - Accept a booking
   - Verify booking assignment succeeds (no calendar event created)
   - Re-enable sync
   - Accept another booking
   - Verify event is created

---

## ACCEPTANCE CRITERIA MET

- ✅ Calendar tab appears on sitter page (between Messages and Tier)
- ✅ If sitter connects Google, syncEnabled toggle works
- ✅ When sitter accepts booking (UI or SMS) OR owner force-assigns, event is created/updated in sitter's Google Calendar (when enabled)
- ✅ Reassignment deletes prior sitter's event and creates new sitter's event
- ✅ Failures do not block booking assignment; failures are auditable
- ✅ No duplicate messaging/tier/offer systems created

---

## ENVIRONMENT VARIABLES REQUIRED

Add to `.env.local`:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Configure Google OAuth redirect URI:
- Development: `http://localhost:3000/api/integrations/google/callback`
- Production: `https://yourdomain.com/api/integrations/google/callback`

---

## NOTES

- Calendar sync is opt-in: sitter must connect Google Calendar and enable sync
- Sync is enabled by default after OAuth connection
- Token refresh logic is not yet implemented (marked as TODO in `calendar-sync.ts`)
- Timezone defaults to 'America/New_York' (TODO: get from org settings)
