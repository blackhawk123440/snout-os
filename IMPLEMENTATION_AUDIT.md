# Implementation Audit Summary

## FEATURE 1: Sitter Messaging Inbox

### Existing Messaging Models (CANONICAL):
- **MessageThread** model in `prisma/schema.prisma`:
  - Fields: `assignedSitterId`, `scope`, `bookingId`, `clientId`
  - Scope values: `client_booking`, `client_general`, `owner_sitter`, `internal`
- **MessageEvent** model for individual messages
- **MessageParticipant** model for thread participants

### Existing Endpoints (TO REUSE):
- `GET /api/messages/threads` - Already supports `sitterId` query param filter
- Current implementation filters by `assignedSitterId` when `sitterId` param provided
- Owner inbox uses `scope='internal'` or `threadType='front_desk'`

### Current SitterMessagesTab:
- Location: `src/components/sitter/SitterMessagesTab.tsx`
- Currently: Just shows button to open full inbox
- Needs: Actual sitter-scoped thread list

### Implementation Plan:
1. Create `GET /api/sitters/[id]/messages` endpoint that returns threads where `assignedSitterId === sitterId`
2. Update `SitterMessagesTab` to fetch and display sitter-scoped threads
3. Ensure owner inbox excludes sitter threads (already does via scope filter)
4. Add first response time metric to tier metrics window

---

## FEATURE 2: Calendar Tab + Google Calendar Sync

### Existing Calendar Integration (TO EXTEND):
- **Google Calendar Library**: `src/lib/google-calendar.ts`
  - Functions: `createGoogleCalendarEvent`, `updateGoogleCalendarEvent`, `deleteGoogleCalendarEvent`
- **GoogleCalendarAccount Model**: EXISTS but email-based (not sitter-based)
  - Fields: `email`, `accessToken`, `refreshToken`, `expiresAt`, `calendarId`
- **Calendar Page**: `/app/calendar/page.tsx` exists (owner view)

### Implementation Plan:
1. Add sitter-specific calendar fields to Sitter model:
   - `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry`, `googleCalendarId`, `calendarSyncEnabled`
2. Create Calendar tab component for `/sitters/[id]` page
3. Add OAuth routes: `/api/integrations/google/start` and `/api/integrations/google/callback`
4. Add `googleCalendarEventId` field to Booking model (or create BookingCalendarLink mapping table)
5. Hook into accept/assign endpoints to sync calendar events
6. Add audit events for calendar operations

---

## FEATURE 3: Use Existing Booking Form

### Existing Booking Form (CANONICAL):
- **Location**: `src/components/bookings/BookingForm.tsx`
- **Features**: 
  - Supports create/edit modes
  - Uses `booking-form-mapper` for validation
  - Has all required fields (client, service, dates, pets, etc.)
- **Status**: ✅ EXISTS and ready to use

### Implementation Plan:
1. Find current booking create page
2. Replace with `BookingForm` component
3. Wire to existing booking create API endpoint
4. No duplicate forms needed

---

## Files to Create/Modify:

### FEATURE 1:
- `src/app/api/sitters/[id]/messages/route.ts` (NEW)
- `src/components/sitter/SitterMessagesTab.tsx` (MODIFY)
- `src/lib/tier-engine.ts` (MODIFY - add first response time metric)

### FEATURE 2:
- `src/components/sitter/SitterCalendarTab.tsx` (NEW)
- `src/app/api/integrations/google/start/route.ts` (NEW)
- `src/app/api/integrations/google/callback/route.ts` (NEW)
- `src/lib/calendar-sync.ts` (NEW)
- `prisma/schema.prisma` (MODIFY - add sitter calendar fields, booking event mapping)
- `src/app/api/sitter/[id]/bookings/[bookingId]/accept/route.ts` (MODIFY - add calendar sync)
- `src/lib/dispatch-control.ts` (MODIFY - add calendar sync to forceAssignSitter)

### FEATURE 3:
- Find and update booking create page to use `BookingForm` component
