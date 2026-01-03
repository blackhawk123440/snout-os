# Feature Gaps Backlog

**Prioritized by Risk and Impact**

---

## P0 - Revenue Risk

### P0-1: Pagination Missing in Bookings List
**Why**: Large datasets will cause performance issues and potential crashes. Revenue-critical bookings list may become unusable with 1000+ bookings.

**Evidence**: 
- `src/app/api/bookings/route.ts` (line 17): `findMany()` with no limit/skip
- `src/app/bookings/page.tsx`: No pagination UI or state management

**Suggested Fix Surface**:
- **API**: Add `limit` and `offset` query params to `GET /api/bookings`
- **UI**: Add pagination controls to `src/app/bookings/page.tsx`
- **DB**: Consider cursor-based pagination for better performance

**Flags/Rollback**: No flag needed, additive feature

---

### P0-2: Optimistic Concurrency Missing
**Why**: Concurrent edits to bookings can cause data loss. Two users editing same booking simultaneously will overwrite each other's changes.

**Evidence**:
- `src/app/api/bookings/[id]/route.ts` (PATCH, line 178): Direct `update()` with no version check
- No `version` field in Booking model (`prisma/schema.prisma`)

**Suggested Fix Surface**:
- **DB**: Add `version: Int @default(0)` to Booking model
- **API**: Check version on update, increment on success
- **UI**: Show error if version mismatch, allow refresh and retry

**Flags/Rollback**: Add behind `ENABLE_OPTIMISTIC_LOCKING` flag (default false)

---

## P0 - Security Risk

### P0-3: Permission Enforcement Incomplete
**Why**: `ENABLE_PERMISSION_CHECKS` flag exists but enforcement logic is minimal. When enabled, may not properly restrict access.

**Evidence**:
- `src/middleware.ts` (line 22): Flag exists but no enforcement logic
- `prisma/schema.prisma`: Role and RolePermission models exist
- No permission checking in API routes

**Suggested Fix Surface**:
- **Service**: Create `src/lib/permission-checker.ts` with permission validation
- **API**: Add permission checks to all protected routes
- **Middleware**: Wire permission checks when flag enabled

**Flags/Rollback**: Already behind `ENABLE_PERMISSION_CHECKS` flag (default false)

---

## P1 - Operations Pain

### P1-1: Global Search Missing
**Why**: Users cannot quickly find bookings, clients, or sitters. Forces navigation through multiple pages.

**Evidence**:
- `src/components/layout/AppShell.tsx`: No search input in header (lines 100-145)
- No search API endpoint found

**Suggested Fix Surface**:
- **UI**: Add search input to AppShell header
- **API**: Create `GET /api/search?q=...` endpoint
- **Service**: Search across bookings, clients, sitters

**Flags/Rollback**: No flag needed, additive feature

---

### P1-2: Global Notifications Missing
**Why**: Users miss important events (unpaid bookings, unassigned bookings, automation failures). No way to see alerts without navigating to exceptions page.

**Evidence**:
- `src/components/layout/AppShell.tsx`: No notification bell/center
- Exceptions exist but not surfaced in header

**Suggested Fix Surface**:
- **UI**: Add notification bell to AppShell header
- **API**: Create `GET /api/notifications` endpoint
- **Service**: Aggregate exceptions and events into notifications

**Flags/Rollback**: No flag needed, additive feature

---

### P1-3: Template Preview Missing
**Why**: Users cannot see how templates will render before saving. Leads to trial-and-error template editing.

**Evidence**:
- `src/app/templates/[id]/page.tsx`: No preview functionality
- Variables exist but no rendering

**Suggested Fix Surface**:
- **UI**: Add preview pane to template edit page
- **Service**: Create template renderer with sample data

**Flags/Rollback**: No flag needed, additive feature

---

### P1-4: Automation Builder UI Missing
**Why**: Automation models exist but no visual interface. Users cannot create custom automations without direct database access.

**Evidence**:
- `prisma/schema.prisma`: Automation, AutomationCondition, AutomationAction models exist
- No UI builder found

**Suggested Fix Surface**:
- **UI**: Create `src/app/automation-center/new/page.tsx` builder
- **API**: Wire to existing automation models
- **Service**: Validate trigger/condition/action combinations

**Flags/Rollback**: No flag needed, additive feature

---

### P1-5: Retry Controls Not Verified
**Why**: "Retry" buttons exist in UI but retry functionality not confirmed. Users may click retry with no effect.

**Evidence**:
- `src/app/exceptions/page.tsx` (line 175): "Retry" button exists
- No retry API endpoint found
- Retry logic not verified

**Suggested Fix Surface**:
- **API**: Create `POST /api/exceptions/[id]/retry` endpoint
- **Service**: Implement retry logic for each exception type
- **UI**: Wire retry button to API

**Flags/Rollback**: No flag needed, additive feature

---

## P2 - Quality of Life

### P2-1: Payment Status Filter Missing
**Why**: Cannot filter bookings by payment status. Must search manually.

**Evidence**:
- `src/app/bookings/page.tsx`: Status filter exists but no payment status filter

**Suggested Fix Surface**:
- **UI**: Add payment status filter dropdown
- **Service**: Filter bookings by `paymentStatus` field

**Flags/Rollback**: No flag needed, additive feature

---

### P2-2: Date Range Filter Incomplete
**Why**: Only "today" filter exists. Cannot filter by custom date ranges.

**Evidence**:
- `src/app/bookings/page.tsx` (lines 98-105): Only "today" filter

**Suggested Fix Surface**:
- **UI**: Add date range picker component
- **API**: Add `startDate` and `endDate` query params

**Flags/Rollback**: No flag needed, additive feature

---

### P2-3: Operational Notes Missing
**Why**: Cannot separate internal notes from client-facing notes. All notes are mixed together.

**Evidence**:
- `prisma/schema.prisma`: Only single `notes` field on Booking model
- No `operationalNotes` or `internalNotes` field

**Suggested Fix Surface**:
- **DB**: Add `operationalNotes: String?` field to Booking model
- **UI**: Add separate notes section in booking detail
- **API**: Update booking detail to include operational notes

**Flags/Rollback**: No flag needed, additive feature

---

### P2-4: Conversation Threads Missing
**Why**: Messages are not threaded by client. Cannot see conversation history easily.

**Evidence**:
- `src/app/messages/page.tsx` (line 7): Explicitly states "manages Message Templates, not conversations"
- Messages linked to bookings but not threaded

**Suggested Fix Surface**:
- **UI**: Create conversation view grouped by client
- **Service**: Group messages by client/booking

**Flags/Rollback**: No flag needed, additive feature

---

### P2-5: Export Capability Missing
**Why**: Cannot export EventLog or other data for analysis or compliance.

**Evidence**:
- No export endpoints found
- No export UI found

**Suggested Fix Surface**:
- **API**: Create `GET /api/event-logs/export?format=csv` endpoint
- **UI**: Add export button to ledger page

**Flags/Rollback**: No flag needed, additive feature

---

### P2-6: Upcoming Payouts Missing
**Why**: Cannot see scheduled payouts. Must calculate manually.

**Evidence**:
- `src/app/payments/page.tsx` (line 149): Comment says "use pending amount as proxy"

**Suggested Fix Surface**:
- **DB**: Add Payout model if needed
- **API**: Calculate upcoming payouts from completed bookings
- **UI**: Display in payments page

**Flags/Rollback**: No flag needed, additive feature

---

### P2-7: Service Type Filter Missing
**Why**: Cannot filter bookings by service type. Must search.

**Evidence**:
- `src/app/bookings/page.tsx`: Service searchable but no filter dropdown

**Suggested Fix Surface**:
- **UI**: Add service type filter dropdown
- **Service**: Filter by `service` field

**Flags/Rollback**: No flag needed, additive feature

---

### P2-8: Sitter Filter Missing
**Why**: Cannot filter bookings by sitter. Must search.

**Evidence**:
- `src/app/bookings/page.tsx`: Sitter searchable but no filter dropdown

**Suggested Fix Surface**:
- **UI**: Add sitter filter dropdown
- **Service**: Filter by `sitterId` field

**Flags/Rollback**: No flag needed, additive feature

---

## Summary

- **P0 Revenue Risk**: 2 items
- **P0 Security Risk**: 1 item
- **P1 Operations Pain**: 5 items
- **P2 Quality of Life**: 8 items

**Total Gaps**: 16 items

