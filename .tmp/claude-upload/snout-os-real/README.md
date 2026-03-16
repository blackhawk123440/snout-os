# SNOUT OS — Real Gap Closure Package (v2)

> Built against actual repo: 1,161 commits, 874 source files, 2,151-line Prisma schema
> Every file uses your real patterns: getScopedDb, getRequestContext, requireAnyRole, tokens, cn()

---

## What This Closes

### From UI_DONE_CHECKLIST.md (closes ~25 of 35 unchecked items)

| File | Drop Into | Checklist Items Closed |
|------|-----------|----------------------|
| `ui/AppTable.tsx` | `src/components/app/AppTable.tsx` | AppTable consistent, column picker, bulk actions, density rows, dark mode tables |
| `ui/AppFilterBar.tsx` | `src/components/app/AppFilterBar.tsx` | AppFilterBar on list pages, saved views dropdown, density padding, dark mode inputs |
| `ui/AppDrawer.tsx` | `src/components/app/AppDrawer.tsx` | AppDrawer for detail views, Framer Motion transitions, density padding, dark mode |
| `ui/AppChartCard.tsx` | `src/components/app/AppChartCard.tsx` | AppChartCard everywhere, title/subtitle/timeframe, skeleton/empty/error states, dark mode |
| `ui/ThemeToggle.tsx` | `src/components/app/ThemeToggle.tsx` + `src/components/app/DensitySelector.tsx` | Theme toggle in topbar, density selector in topbar, data-density on html |

### From REMAINING_GAPS.md (closes all 5 major gaps)

| File | Drop Into | Gap Closed |
|------|-----------|-----------|
| `workers/automation-worker-v2.ts` | `src/worker/automation-worker-v2.ts` | #4: Event-driven worker, no scanning, horizontally scalable |
| `stripe-connect/stripe-connect-payouts.ts` | `src/lib/stripe-connect-payouts.ts` | #2.1: Connect onboarding, transfers, earnings, instant payouts |
| `availability/recurring-engine.ts` | `src/lib/availability/recurring-engine.ts` | #1.1: RRULE expansion, merge logic, conflict detection, admin override |
| `calendar/bidirectional-sync.ts` | `src/lib/calendar/bidirectional-sync.ts` | #1.2: Google→Snout ingestion, conflict resolution, edit policy |

---

## Integration Notes (What to wire up after dropping files)

### 1. UI Components

**AppTable** — Replace raw `<table>` usage in these pages with `<AppTable>`:
- `src/app/bookings/page.tsx`
- `src/app/clients/page.tsx`
- `src/app/payments/page.tsx`
- `src/app/sitters/page.tsx`
- `src/app/payroll/page.tsx`

**AppFilterBar** — Add above each `<AppTable>` on list pages. Example:
```tsx
<AppFilterBar
  filters={[
    { key: 'search', label: 'Search', type: 'search' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'completed', label: 'Completed' },
    ]},
  ]}
  values={filters}
  onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
  savedViews={[
    { id: 'all', label: 'All', filters: {} },
    { id: 'today', label: 'Today', filters: { date: todayString } },
    { id: 'week', label: 'This Week', filters: { range: '7d' } },
  ]}
  activeView={activeView}
  onViewChange={setActiveView}
/>
```

**ThemeToggle + DensitySelector** — Add to your TopBar component:
```tsx
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { DensitySelector } from '@/components/app/DensitySelector'; // same file

// In TopBar JSX:
<div className="flex items-center gap-2">
  <DensitySelector />
  <ThemeToggle />
</div>
```

**AppChartCard** — Replace ad hoc chart wrappers in:
- `src/app/analytics/page.tsx`
- `src/app/finance/page.tsx`
- `src/components/charts/RevenueChart.tsx`
- `src/components/charts/DailyLineChart.tsx`

### 2. Automation Worker

In `src/worker/index.ts`, replace the old worker import:
```ts
// OLD:
// import { startAutomationWorker } from './automation-worker';
// NEW:
import { startAutomationWorker } from './automation-worker-v2';
```

Then in your booking/status-change handlers, dispatch events instead of relying on scanning:
```ts
import { dispatchAutomationEvent } from '@/worker/automation-worker-v2';

// After creating a booking:
await dispatchAutomationEvent({
  orgId,
  eventType: 'booking.created',
  entityType: 'booking',
  entityId: booking.id,
  payload: booking,
  triggeredAt: new Date().toISOString(),
});
```

### 3. Stripe Connect

Wire into the existing sitter earnings page (`src/app/sitter/earnings/page.tsx`):
```ts
import { getEarningsSummary, getAccountStatus } from '@/lib/stripe-connect-payouts';
```

Replace the existing stub routes at `src/app/api/sitter/stripe/connect/route.ts` with the code in the commented section at the bottom of `stripe-connect-payouts.ts`.

### 4. Recurring Availability

Wire into booking creation — before confirming a booking:
```ts
import { checkBookingConflict } from '@/lib/availability/recurring-engine';

const result = await checkBookingConflict(sitterId, orgId, startAt, endAt);
if (result.hasConflict) {
  // Show conflicts to user, require admin override
}
```

### 5. Calendar Bidirectional Sync

Add the worker to `src/worker/index.ts` (commented code at bottom of the file).
The sync runs every 5 minutes for all sitters with `calendarSyncEnabled: true`.
Conflicts are logged to EventLog and surface in the ops/failures dashboard.

---

## What Was NOT Included (remaining checklist items)

These require page-by-page work, not new components:
- [ ] Shell role-aware nav config — modify `src/components/layout/AppShell.tsx`
- [ ] Global search bar stubbed in topbar
- [ ] Cmd+K wiring (you have `CommandPalette.tsx` — just wire the shortcut)
- [ ] Each owner route equally finished (12 pages need individual review)
- [ ] Snapshot tests green (Playwright-specific, needs running against actual pages)

These require the GDPR gap work (listed in REMAINING_GAPS #5):
- [ ] Client data export endpoint (you have stubs at `src/app/api/client/export/`)
- [ ] Delete-account flow (you have stubs at `src/app/api/client/delete-account/`)

---

## No New Dependencies Required

Everything uses your existing stack:
- framer-motion (already in package.json)
- bullmq + ioredis (already in package.json)
- stripe (already in package.json)
- @prisma/client (already in package.json)
- Google Calendar API (already used in google-calendar.ts)
- All UI uses your existing design tokens + CSS variables
