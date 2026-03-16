/**
 * Client Portal Navigation Registry
 */

export const CLIENT_TABS = [
  { id: 'home', label: 'Home', href: '/client/home', icon: 'fas fa-home' },
  { id: 'bookings', label: 'Bookings', href: '/client/bookings', icon: 'fas fa-calendar-check' },
  { id: 'pets', label: 'Pets', href: '/client/pets', icon: 'fas fa-paw' },
  { id: 'messages', label: 'Messages', href: '/client/messages', icon: 'fas fa-inbox' },
  { id: 'reports', label: 'Reports', href: '/client/reports', icon: 'fas fa-file-alt' },
  { id: 'billing', label: 'Billing', href: '/client/billing', icon: 'fas fa-credit-card' },
  { id: 'profile', label: 'Profile', href: '/client/profile', icon: 'fas fa-user' },
] as const;

export const CLIENT_NAV_GROUPS = [
  { label: 'Overview', items: [CLIENT_TABS[0]] },
  {
    label: 'Operations',
    items: [CLIENT_TABS[1], CLIENT_TABS[2], CLIENT_TABS[3], CLIENT_TABS[4], CLIENT_TABS[5]],
  },
  { label: 'Account', items: [CLIENT_TABS[6]] },
] as const;
