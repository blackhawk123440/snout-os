/**
 * Client Portal Navigation Registry
 */

export const CLIENT_TABS = [
  { id: 'home', label: 'Home', href: '/client/home', icon: 'fas fa-home' },
  { id: 'bookings', label: 'Bookings', href: '/client/bookings', icon: 'fas fa-calendar-check' },
  { id: 'pets', label: 'Pets', href: '/client/pets', icon: 'fas fa-paw' },
  { id: 'messages', label: 'Messages', href: '/client/messages', icon: 'fas fa-inbox' },
  { id: 'billing', label: 'Billing', href: '/client/billing', icon: 'fas fa-credit-card' },
  { id: 'profile', label: 'Profile', href: '/client/profile', icon: 'fas fa-user' },
] as const;
