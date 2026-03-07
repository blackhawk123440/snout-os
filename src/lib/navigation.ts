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

/** Canonical owner portal navigation (enterprise-grade) */
export const ownerNavigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-chart-line' },
  { label: 'Command Center', href: '/command-center', icon: 'fas fa-th-large' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar' },
  { label: 'Clients', href: '/clients', icon: 'fas fa-users' },
  { label: 'Sitters', href: '/sitters', icon: 'fas fa-user-friends' },
  { label: 'Sitter Profile', href: '/sitters/profile', icon: 'fas fa-id-badge' },
  {
    label: 'Messaging',
    href: '/messaging',
    icon: 'fas fa-comments',
    children: [
      { label: 'Owner Inbox', href: '/messaging/inbox', icon: 'fas fa-inbox' },
      { label: 'Sitters', href: '/messaging/sitters', icon: 'fas fa-user-check' },
      { label: 'Numbers', href: '/messaging/numbers', icon: 'fas fa-phone' },
      { label: 'Assignments', href: '/messaging/assignments', icon: 'fas fa-link' },
      { label: 'Twilio Setup', href: '/twilio-setup', icon: 'fas fa-satellite-dish' },
    ],
  },
  { label: 'Numbers', href: '/numbers', icon: 'fas fa-phone-volume' },
  { label: 'Assignments', href: '/assignments', icon: 'fas fa-random' },
  { label: 'Twilio Setup', href: '/twilio-setup', icon: 'fas fa-satellite-dish' },
  { label: 'Automations', href: '/automations', icon: 'fas fa-robot' },
  { label: 'Growth / Tiers', href: '/growth', icon: 'fas fa-arrow-trend-up' },
  { label: 'Payroll', href: '/payroll', icon: 'fas fa-money-bill-wave' },
  { label: 'Reports', href: '/reports', icon: 'fas fa-chart-pie' },
  { label: 'Finance', href: '/finance', icon: 'fas fa-building-columns' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
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
