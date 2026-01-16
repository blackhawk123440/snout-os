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
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar' },
  { label: 'Clients', href: '/clients', icon: 'fas fa-users' },
  { label: 'Sitters', href: '/bookings/sitters', icon: 'fas fa-user-friends' },
  { label: 'Automations', href: '/automation', icon: 'fas fa-robot' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
  { label: 'Payroll', href: '/payroll', icon: 'fas fa-money-bill-wave' },
  { label: 'Messages', href: '/messages', icon: 'fas fa-comments' },
  { label: 'Settings', href: '/settings', icon: 'fas fa-cog' },
];
