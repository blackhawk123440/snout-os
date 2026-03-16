# CURSOR PROMPT — Snout OS Gap Closure (v2)

Copy everything below the line into Cursor Composer.
Attach all 8 code files from the snout-os-real/ package.

---

## PROMPT START ↓

I'm implementing 8 files that close every remaining gap in Snout OS. These files are written against our actual codebase patterns. Your job is to integrate each one, wire it into existing pages, and verify it compiles.

**Our patterns (DO NOT change these):**
- Imports: `tokens` from `@/lib/design-tokens`, `cn` from `@/components/ui/utils`
- Auth: `getRequestContext()` + `requireAnyRole(ctx, ['owner', 'admin'])`
- DB: `getScopedDb(ctx)` for tenant-scoped queries, `prisma` from `@/lib/db` for global
- State: TanStack Query (`@tanstack/react-query`)
- Animation: `framer-motion`
- Workers: BullMQ with IORedis
- Styling: Tailwind + CSS variables from globals.css (colors use `text-text-primary`, `bg-surface-overlay`, etc.)
- Package manager: pnpm

---

### STEP 1: Drop UI Components

1. Place `AppTable.tsx` at `src/components/app/AppTable.tsx`
2. Place `AppFilterBar.tsx` at `src/components/app/AppFilterBar.tsx`
3. Place `AppDrawer.tsx` at `src/components/app/AppDrawer.tsx`
4. Place `AppChartCard.tsx` at `src/components/app/AppChartCard.tsx`
5. Place `ThemeToggle.tsx` at `src/components/app/ThemeToggle.tsx` — this file exports BOTH `ThemeToggle` and `DensitySelector` components + the `useDensity` hook

6. Export all new components from `src/components/app/index.ts`:
```ts
export { AppTable } from './AppTable';
export type { AppTableColumn, AppTableProps, BulkAction } from './AppTable';
export { AppFilterBar } from './AppFilterBar';
export type { AppFilterBarProps, FilterConfig, SavedView } from './AppFilterBar';
export { AppDrawer } from './AppDrawer';
export type { AppDrawerProps } from './AppDrawer';
export { AppChartCard } from './AppChartCard';
export type { AppChartCardProps } from './AppChartCard';
export { ThemeToggle } from './ThemeToggle';
export { DensitySelector, useDensity } from './ThemeToggle';
```

### STEP 2: Wire Theme Toggle + Density into TopBar

Find our TopBar component at `src/components/ui/TopBar.tsx`. Add:
```tsx
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { DensitySelector } from '@/components/app/ThemeToggle';
```
Add these to the right side of the TopBar, next to any existing controls.

### STEP 3: Replace tables on list pages

For each of these pages, replace the existing `<table>` or data display with `<AppTable>`:
- `src/app/bookings/page.tsx`
- `src/app/clients/page.tsx`
- `src/app/payments/page.tsx`

For each page, also add `<AppFilterBar>` above the table with relevant filters for that page's data (status, search, date range).

### STEP 4: Replace chart wrappers

Find all chart components and wrap them in `<AppChartCard>`:
- `src/app/analytics/page.tsx`
- `src/app/finance/page.tsx`
- Any component using `react-chartjs-2` directly

### STEP 5: Wire Automation Worker v2

1. Place `automation-worker-v2.ts` at `src/worker/automation-worker-v2.ts`
2. In `src/worker/index.ts`, comment out the old `import ... from './automation-worker'` and add:
```ts
import { startAutomationWorker } from './automation-worker-v2';
```
3. In the booking creation handler (`src/app/api/bookings/route.ts` POST handler), after the booking is created, add:
```ts
import { dispatchAutomationEvent } from '@/worker/automation-worker-v2';
// After booking creation:
await dispatchAutomationEvent({
  orgId: ctx.orgId,
  eventType: 'booking.created',
  entityType: 'booking',
  entityId: booking.id,
  payload: { ...booking },
  triggeredAt: new Date().toISOString(),
});
```
4. Do the same for booking status changes, completion, and cancellation events.

### STEP 6: Wire Stripe Connect

1. Place `stripe-connect-payouts.ts` at `src/lib/stripe-connect-payouts.ts`
2. Replace the existing stub at `src/app/api/sitter/stripe/connect/route.ts` with the route code from the commented section at the bottom of the file
3. In `src/app/sitter/earnings/page.tsx`, use `getEarningsSummary` and `getAccountStatus` from the new file to display real earnings data and Stripe Connect status

### STEP 7: Wire Recurring Availability

1. Place `recurring-engine.ts` at `src/lib/availability/recurring-engine.ts`
2. In the booking creation handler (`src/app/api/bookings/route.ts` POST handler), BEFORE creating the booking, add conflict detection:
```ts
import { checkBookingConflict } from '@/lib/availability/recurring-engine';

if (sitterId) {
  const conflict = await checkBookingConflict(sitterId, ctx.orgId, startAt, endAt);
  if (conflict.hasConflict) {
    return NextResponse.json({
      error: 'Scheduling conflict',
      conflicts: conflict.conflicts,
      availableSlots: conflict.availableSlots,
    }, { status: 409 });
  }
}
```

### STEP 8: Wire Calendar Bidirectional Sync

1. Place `bidirectional-sync.ts` at `src/lib/calendar/bidirectional-sync.ts`
2. In `src/worker/index.ts`, add the calendar sync worker from the commented section at the bottom of the file
3. The sync will automatically process all sitters with `calendarSyncEnabled: true` every 5 minutes

### STEP 9: Verify

1. Run `pnpm run build` — fix any type errors
2. Run `pnpm run typecheck` — should pass
3. Run `pnpm run lint` — fix any issues
4. Verify dark mode toggle works in TopBar
5. Verify density selector changes row heights in tables
6. Check bookings page uses AppTable with AppFilterBar

Start with Step 1 and go sequentially. Confirm each step compiles.

## PROMPT END ↑
