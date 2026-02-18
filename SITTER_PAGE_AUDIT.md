# Sitter Individual Page Audit Results

## EXISTING IMPLEMENTATIONS FOUND

### 1. Sitter Routes/Pages ✅
- **`/sitters/[id]/page.tsx`** - EXISTS with 3 tabs: Dashboard, Tier, Messages
- **`/sitter/dashboard/page.tsx`** - Sitter self-portal (different from owner view)
- **`/sitter/inbox/page.tsx`** - Sitter inbox

### 2. Tier System ✅
- **`TierSummaryCard`** - EXISTS (`src/components/sitter/TierSummaryCard.tsx`)
- **`TierTab`** - EXISTS (`src/components/sitter/TierTab.tsx`)
- **`SitterSRSCard`** - EXISTS (sitter self-view)
- **`OwnerSRSCard`** - EXISTS (owner view)
- **`tier-engine-twilio.ts`** - Tier computation engine
- **`SitterTierHistory`** model - EXISTS in Prisma
- **`SitterMetricsWindow`** model - EXISTS in Prisma
- **API endpoints**: `/api/sitters/[id]/tier/summary` and `/tier/details` - EXIST

### 3. Messaging ✅
- **`SitterMessagesTab`** - EXISTS (`src/components/sitter/SitterMessagesTab.tsx`)
- **`InboxView`** component - EXISTS
- **`/sitter/inbox/page.tsx`** - Sitter inbox page

### 4. Bookings/Offers ✅
- **`OfferEvent`** model - EXISTS with status fields (sent/accepted/declined/expired)
- **`PendingRequests`** component - EXISTS
- **Accept/decline endpoints** - EXIST (`/api/sitter/[id]/bookings/[bookingId]/accept|decline`)

### 5. Payroll ✅
- **`/api/payroll/sitter/[id]`** - EXISTS
- **`SitterPayrollPage`** - EXISTS (`src/app/sitter-payroll/page.tsx`)
- **Payroll engine** - EXISTS (`src/lib/payroll-engine.ts`)

### 6. Profile ✅
- **`SitterProfileTab`** - EXISTS (`src/components/sitter/SitterProfileTab.tsx`)
- Identity/compliance only (name, contact, commission)

### 7. Performance ✅
- **`PerformanceSnapshot`** - EXISTS (`src/components/sitter/PerformanceSnapshot.tsx`)
- Shows acceptance rate, completion rate, on-time rate, client rating

### 8. Activity/Logs ⚠️
- **`AuditEvent`** model - EXISTS in NestJS schema (NOT in Next.js Prisma schema)
- **`event-logger.ts`** - EXISTS but uses AuditEvent
- **No Activity/Logs tab** - MISSING

## WHAT EXISTS IN `/sitters/[id]/page.tsx`

**Current tabs (3):**
1. Dashboard - Has stats, bookings, profile card, messaging, tier summary, quick actions, payroll snapshot
2. Tier - Uses `TierTab` component
3. Messages - Uses `SitterMessagesTab` component

**Missing:**
- Global header (status/availability/tier/quick actions)
- Profile tab (component exists but not integrated)
- Performance tab (component exists but not as tab)
- Payroll tab
- Activity/Logs tab

## REUSE STRATEGY

### Components to Reuse (NO DUPLICATES):
1. ✅ `TierSummaryCard` - Already in Dashboard tab
2. ✅ `TierTab` - Already in Tier tab
3. ✅ `SitterMessagesTab` - Already in Messages tab
4. ✅ `SitterProfileTab` - EXISTS, needs to be added as Profile tab
5. ✅ `PerformanceSnapshot` - EXISTS, needs wrapper for Performance tab
6. ✅ `PendingRequests` - Already in Dashboard (via dashboard API)
7. ✅ `UpcomingBookings` - Already in Dashboard
8. ✅ `CompletedBookings` - Component exists, may need to add to Dashboard

### API Endpoints to Reuse:
1. ✅ `/api/sitters/[id]` - Get sitter data
2. ✅ `/api/sitters/[id]/tier/summary` - Tier summary
3. ✅ `/api/sitters/[id]/tier/details` - Tier details
4. ✅ `/api/sitter/me/dashboard` - Dashboard data (pending requests, bookings)
5. ✅ `/api/payroll/sitter/[id]` - Payroll data

## WHAT TO ADD

### 1. Global Header Component
- Sitter name
- Status badge (Active/Inactive/Suspended)
- Availability toggle (if permissioned)
- Tier badge
- Quick actions (Disable sitter, Add note, Open audit log)

### 2. Expand Tab List
- Add: Profile, Performance, Payroll, Activity
- Total: 7 tabs (Dashboard, Profile, Messages, Tier, Performance, Payroll, Activity)

### 3. Profile Tab
- Use existing `SitterProfileTab` component
- Add to tab list

### 4. Performance Tab
- Create wrapper around `PerformanceSnapshot`
- Add more detailed metrics (trends, SLA breaches)
- Foundation state if no data

### 5. Payroll Tab
- Create component using `/api/payroll/sitter/[id]`
- Show earnings summary, pending/completed payouts
- Foundation state if no data

### 6. Activity/Logs Tab
- Create component to show audit events
- May need to add AuditEvent to Next.js Prisma schema OR use existing event-logger
- Foundation state explaining what it tracks

### 7. Enhance Dashboard Tab
- Ensure all required sections present:
  - ✅ Pending booking requests (via PendingRequests)
  - ✅ Upcoming bookings list
  - ⚠️ Inbox summary (unread count + latest thread preview) - NEED TO ADD
  - ✅ Tier summary (TierSummaryCard)
  - ✅ Performance snapshot (PerformanceSnapshot)
  - ⚠️ Completed bookings (collapsed) - MAY NEED TO ADD

## IMPLEMENTATION PLAN

1. Create `SitterPageHeader` component (global header)
2. Add missing tabs to `/sitters/[id]/page.tsx`
3. Create `PerformanceTab` component (wrapper around PerformanceSnapshot)
4. Create `PayrollTab` component
5. Create `ActivityTab` component
6. Add inbox summary to Dashboard tab
7. Ensure Dashboard tab has all required sections
8. Test foundation states for all tabs

## NO DUPLICATES GUARANTEE

- Will NOT create duplicate tier components
- Will NOT create duplicate messaging components
- Will NOT create duplicate profile components
- Will reuse all existing components and endpoints
- Will extend existing page, not create parallel system
