/**
 * Shared Navigation Configuration
 * 
 * Central source of truth for application navigation items.
 * Used by AppShell and TopBar for consistent navigation across all pages.
 */

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  children?: NavItem[];
}

/**
 * Canonical owner portal navigation (enterprise-grade).
 * Matches OwnerAppShell structure: Messaging (Inbox, Sitters, Numbers, Routing, Twilio Setup); Platform = Integrations, Settings; no Automations in nav; no Sitter Profile.
 * Used by AppShell when isOwner. OwnerAppShell uses OWNER_SIDEBAR_SECTIONS with sections and single-expand behavior.
 */
export const ownerNavigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-chart-line' },
  { label: 'Command Center', href: '/command-center', icon: 'fas fa-th-large' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar' },
  { label: 'Clients', href: '/clients', icon: 'fas fa-users' },
  { label: 'Sitters', href: '/sitters', icon: 'fas fa-user-friends' },
  {
    label: 'Messaging',
    href: '/messaging',
    icon: 'fas fa-comments',
    children: [
      { label: 'Inbox', href: '/messaging/inbox', icon: 'fas fa-inbox' },
      { label: 'Sitters', href: '/messaging/sitters', icon: 'fas fa-user-check' },
      { label: 'Numbers', href: '/messaging/numbers', icon: 'fas fa-phone' },
      { label: 'Routing', href: '/messaging/assignments', icon: 'fas fa-link' },
      { label: 'Twilio Setup', href: '/messaging/twilio-setup', icon: 'fas fa-satellite-dish' },
    ],
  },
  { label: 'Growth / Tiers', href: '/growth', icon: 'fas fa-arrow-trend-up' },
  { label: 'Payroll', href: '/payroll', icon: 'fas fa-money-bill-wave' },
  { label: 'Reports', href: '/reports', icon: 'fas fa-chart-pie' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
  { label: 'Finance', href: '/finance', icon: 'fas fa-building-columns' },
  { label: 'Integrations', href: '/integrations', icon: 'fas fa-plug' },
  { label: 'Settings', href: '/settings', icon: 'fas fa-cog' },
  { label: 'Ops / Diagnostics', href: '/ops/diagnostics', icon: 'fas fa-stethoscope' },
];

export const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar' },
  { label: 'Clients', href: '/clients', icon: 'fas fa-users' },
  { label: 'Sitters', href: '/bookings/sitters', icon: 'fas fa-user-friends' },
  { label: 'Automations', href: '/automations', icon: 'fas fa-robot' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
  { label: 'Payroll', href: '/payroll', icon: 'fas fa-money-bill-wave' },
  {
    label: 'Messaging',
    href: '/messages',
    icon: 'fas fa-comments',
  },
  { label: 'Pricing', href: '/pricing', icon: 'fas fa-tag' },
  { label: 'Settings', href: '/settings', icon: 'fas fa-cog' },
];
