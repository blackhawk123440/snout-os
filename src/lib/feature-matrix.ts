/**
 * Feature Completion Gate — Canonical contract for "implemented"
 *
 * Each feature gets a row. Status + definitionOfDone define what "done" means.
 * Enforced by scripts/feature-audit.ts in CI.
 *
 * DoD: "UI+API+RBAC+E2E" = surface-complete + API contract + permissions + tests
 */

export type Portal = 'owner' | 'sitter' | 'client';
export type FeatureStatus = 'live' | 'beta' | 'coming_soon';

export interface FeatureEntry {
  portal: Portal;
  slug: string;
  routes: string[];
  apis: string[];
  tests: {
    snapshot?: string;
    smoke?: string;
    contract?: string;
    e2e?: string;
  };
  status: FeatureStatus;
  definitionOfDone: string;
}

/** Canonical feature set — single source of truth */
export const FEATURE_MATRIX: FeatureEntry[] = [
  // ─── Owner: Ops & Dispatch ─────────────────────────────────────────────
  {
    portal: 'owner',
    slug: 'owner.command-center',
    routes: ['/command-center'],
    apis: ['/api/ops/metrics'],
    tests: { snapshot: 'owner-command-center' },
    status: 'live',
    definitionOfDone: 'KPIs, needs-attention queue, timeline, map placeholder',
  },
  {
    portal: 'owner',
    slug: 'owner.bookings',
    routes: ['/bookings', '/bookings/[id]'],
    apis: [], // May be proxied via BFF
    tests: { snapshot: 'owner-bookings' },
    status: 'live',
    definitionOfDone: 'List + detail drawer + bulk actions + saved views',
  },
  {
    portal: 'owner',
    slug: 'owner.calendar',
    routes: ['/calendar'],
    apis: [], // Bookings may be proxied
    tests: { snapshot: 'owner-calendar' },
    status: 'live',
    definitionOfDone: 'Schedule view + event detail drawer',
  },
  {
    portal: 'owner',
    slug: 'owner.dispatch',
    routes: ['/dispatch'],
    apis: ['/api/dispatch/force-assign', '/api/dispatch/attention', '/api/ops/bookings/[id]/sitter-suggestions'],
    tests: { snapshot: 'owner-dispatch' },
    status: 'live',
    definitionOfDone: 'Unassigned bookings + assign flow + AI suggestions UI',
  },
  // ─── Owner: People ─────────────────────────────────────────────────────
  {
    portal: 'owner',
    slug: 'owner.clients',
    routes: ['/clients', '/clients/[id]'],
    apis: [], // May be proxied via BFF
    tests: { snapshot: 'owner-clients' },
    status: 'live',
    definitionOfDone: 'List + profile drawer + pets + notes',
  },
  {
    portal: 'owner',
    slug: 'owner.sitters',
    routes: ['/bookings/sitters', '/sitters/[id]'],
    apis: ['/api/sitters', '/api/sitters/[id]'],
    tests: { snapshot: 'owner-sitters' },
    status: 'live',
    definitionOfDone: 'List + profile drawer + tiers/status + availability',
  },
  // ─── Owner: Comms & Automation ─────────────────────────────────────────
  {
    portal: 'owner',
    slug: 'owner.messaging',
    routes: ['/messages'],
    apis: ['/api/messages/threads', '/api/messages/threads/[id]', '/api/messages/send'],
    tests: { snapshot: 'owner-messages' },
    status: 'live',
    definitionOfDone: 'Inbox + thread view',
  },
  {
    portal: 'owner',
    slug: 'owner.automations',
    routes: ['/automation', '/automation-center', '/automation-center/[id]'],
    apis: [],
    tests: { snapshot: 'owner-automations' },
    status: 'live',
    definitionOfDone: 'Rules + runs/audit UI surface',
  },
  {
    portal: 'owner',
    slug: 'owner.notifications',
    routes: [],
    apis: [],
    tests: {},
    status: 'coming_soon',
    definitionOfDone: 'Notifications center UI surface',
  },
  // ─── Owner: Money ──────────────────────────────────────────────────────
  {
    portal: 'owner',
    slug: 'owner.finance',
    routes: ['/finance', '/payments'],
    apis: ['/api/ops/metrics'],
    tests: { snapshot: 'owner-finance' },
    status: 'live',
    definitionOfDone: 'Revenue cards, invoices/payouts placeholders',
  },
  {
    portal: 'owner',
    slug: 'owner.pricing-rules',
    routes: ['/settings/pricing', '/pricing'],
    apis: [],
    tests: {},
    status: 'live',
    definitionOfDone: 'Pricing rules UI surface',
  },
  // ─── Owner: Admin ──────────────────────────────────────────────────────
  {
    portal: 'owner',
    slug: 'owner.analytics',
    routes: ['/analytics'],
    apis: ['/api/ops/metrics', '/api/ops/forecast/revenue'],
    tests: { snapshot: 'owner-analytics' },
    status: 'live',
    definitionOfDone: 'Charts, filters',
  },
  {
    portal: 'owner',
    slug: 'owner.integrations',
    routes: ['/integrations'],
    apis: ['/api/integrations/google/start', '/api/setup/provider/status'],
    tests: { snapshot: 'owner-integrations' },
    status: 'live',
    definitionOfDone: 'Google/Stripe/SMS status panels',
  },
  {
    portal: 'owner',
    slug: 'owner.settings',
    routes: ['/settings'],
    apis: [], // Settings may be proxied via BFF
    tests: { snapshot: 'owner-settings' },
    status: 'live',
    definitionOfDone: 'Org settings, branding, roles',
  },
  // ─── Sitter ────────────────────────────────────────────────────────────
  {
    portal: 'sitter',
    slug: 'sitter.today',
    routes: ['/sitter/today'],
    apis: ['/api/sitter/today'],
    tests: { snapshot: 'today' },
    status: 'live',
    definitionOfDone: 'Jobs, check-in/out, delight modal',
  },
  {
    portal: 'sitter',
    slug: 'sitter.calendar',
    routes: ['/sitter/calendar'],
    apis: ['/api/sitter/calendar', '/api/sitter/route'],
    tests: { snapshot: 'calendar' },
    status: 'live',
    definitionOfDone: 'Schedule + route optimization MVP',
  },
  {
    portal: 'sitter',
    slug: 'sitter.inbox',
    routes: ['/sitter/inbox'],
    apis: ['/api/sitter/threads', '/api/messages/send'],
    tests: { snapshot: 'inbox' },
    status: 'live',
    definitionOfDone: 'Threads + composer + suggested replies beta',
  },
  {
    portal: 'sitter',
    slug: 'sitter.jobs',
    routes: ['/sitter/jobs'],
    apis: ['/api/sitter/bookings/[id]', '/api/sitter/completed-jobs'],
    tests: {},
    status: 'live',
    definitionOfDone: 'Active/upcoming/completed',
  },
  {
    portal: 'sitter',
    slug: 'sitter.pets',
    routes: ['/sitter/pets', '/sitter/pets/[id]'],
    apis: ['/api/client/pets', '/api/client/pets/[id]'],
    tests: {},
    status: 'live',
    definitionOfDone: 'Read-only assigned pets + pet details',
  },
  {
    portal: 'sitter',
    slug: 'sitter.reports',
    routes: ['/sitter/reports'],
    apis: ['/api/bookings/[id]/daily-delight'],
    tests: {},
    status: 'beta',
    definitionOfDone: 'History + composer',
  },
  {
    portal: 'sitter',
    slug: 'sitter.availability',
    routes: ['/sitter/availability'],
    apis: ['/api/sitter/availability', '/api/sitter/block-off'],
    tests: {},
    status: 'live',
    definitionOfDone: 'Toggle + blocks',
  },
  {
    portal: 'sitter',
    slug: 'sitter.earnings',
    routes: ['/sitter/earnings'],
    apis: ['/api/sitter/earnings'],
    tests: { snapshot: 'earnings' },
    status: 'live',
    definitionOfDone: 'Breakdown + payout CTA',
  },
  {
    portal: 'sitter',
    slug: 'sitter.profile',
    routes: ['/sitter/profile'],
    apis: ['/api/sitter/me'],
    tests: {},
    status: 'live',
    definitionOfDone: 'Verification/badges/training entrypoints',
  },
  // ─── Client ────────────────────────────────────────────────────────────
  {
    portal: 'client',
    slug: 'client.home',
    routes: ['/client/home'],
    apis: ['/api/client/home'],
    tests: { snapshot: 'client-home' },
    status: 'live',
    definitionOfDone: 'Upcoming visits + latest report',
  },
  {
    portal: 'client',
    slug: 'client.bookings',
    routes: ['/client/bookings', '/client/bookings/[id]'],
    apis: ['/api/client/bookings', '/api/client/bookings/[id]'],
    tests: { snapshot: 'client-bookings' },
    status: 'live',
    definitionOfDone: 'List + details',
  },
  {
    portal: 'client',
    slug: 'client.pets',
    routes: ['/client/pets', '/client/pets/[id]'],
    apis: ['/api/client/pets', '/api/client/pets/[id]'],
    tests: { snapshot: 'client-pets' },
    status: 'live',
    definitionOfDone: 'Profiles',
  },
  {
    portal: 'client',
    slug: 'client.reports',
    routes: ['/client/reports', '/client/reports/[id]'],
    apis: ['/api/client/reports', '/api/client/reports/[id]'],
    tests: {},
    status: 'live',
    definitionOfDone: 'Feed + detail',
  },
  {
    portal: 'client',
    slug: 'client.messages',
    routes: ['/client/messages', '/client/messages/[id]'],
    apis: ['/api/client/messages', '/api/client/messages/[id]'],
    tests: { snapshot: 'client-messages' },
    status: 'live',
    definitionOfDone: 'Threads + composer',
  },
  {
    portal: 'client',
    slug: 'client.billing',
    routes: ['/client/billing'],
    apis: ['/api/client/billing'],
    tests: {},
    status: 'live',
    definitionOfDone: 'Invoices + pay links',
  },
  {
    portal: 'client',
    slug: 'client.loyalty',
    routes: [],
    apis: [],
    tests: {},
    status: 'coming_soon',
    definitionOfDone: 'Loyalty + referrals (display-only v1)',
  },
  {
    portal: 'client',
    slug: 'client.profile',
    routes: ['/client/profile'],
    apis: ['/api/client/me'],
    tests: { snapshot: 'client-profile' },
    status: 'live',
    definitionOfDone: 'Profile/settings',
  },
];

/** Route path → page file path (Next.js app router) */
export function routeToPagePath(route: string): string {
  const base = route.replace(/^\/+/, '');
  if (!base) return 'src/app/page.tsx';
  return `src/app/${base}/page.tsx`;
}

/** API path → route file path */
export function apiToRoutePath(api: string): string {
  const base = api.replace(/^\/api\/?/, '');
  if (!base) return 'src/app/api/route.ts';
  return `src/app/api/${base}/route.ts`;
}
