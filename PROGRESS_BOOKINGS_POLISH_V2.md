# Bookings Polish V2 - Progress Report

## Part F: Sitter Pool Truth - ✅ COMPLETE

### Schema Changes
- Added `BookingSitterPool` model to `prisma/schema.prisma`
- Fields: `id`, `bookingId`, `sitterId`, `createdAt`, `createdByUserId`
- Unique constraint on `[bookingId, sitterId]`
- Relations: `booking` (Booking), `sitter` (Sitter)
- Migration: `add_booking_sitter_pool` (create-only, pending DB connection)

### API Updates
- **GET /api/bookings**: Returns `sitterPool` with `sitter.currentTier` for each booking
- **GET /api/bookings/[id]**: Returns `sitterPool` with `sitter.currentTier` for booking detail
- **PATCH /api/bookings/[id]**: 
  - Accepts `sitterPoolIds` array in request body
  - Validates all sitter IDs exist
  - Transactionally deletes old pool entries and creates new ones
  - Logs changes via EventLog (`booking.sitterPoolUpdated` event)

### Files Changed
- `prisma/schema.prisma` - Added BookingSitterPool model
- `src/app/api/bookings/route.ts` - Added sitterPool to include
- `src/app/api/bookings/[id]/route.ts` - Added sitterPool to includes, added sitterPoolIds update logic

### Status
- ✅ Schema formatted and validated
- ✅ Prisma client generated
- ✅ Typecheck passes
- ⚠️ Migration pending (DB not reachable - will be created when DB is available)

---

## Remaining Work

### Part B: Booking Card System (Next)
- Create `BookingCardMobileSummary` component
- Create `BookingStatusInlineControl` component  
- Create `SitterPoolPicker` component
- Update mobile booking card layout to use these components

### Part A: Mobile List Header
- Add compact header bar with booking count
- Add hide stats toggle (localStorage persisted)
- Add select all checkbox
- Add batch actions (change status, add to sitter pool, clear selection)

### Part C: Booking Detail Mobile Fixes
- Fix dual scroll (single scroll container)
- Default sections open (schedule, pricing, sitter, pets, notes)
- Fix top summary block layout
- Improve bottom action bar (icons next to text, aligned baselines)
- Ensure pricing breakdown visible by default

### Part D: Desktop KPI Slimming
- Reduce vertical space of KPI boxes on booking detail
- Use tokens only

### Part E: Sitter Sort Verification
- Verify sort by sitter exists in both mobile and desktop
- Verify unassigned grouping is consistent

