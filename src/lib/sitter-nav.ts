/**
 * Sitter Dashboard Navigation Registry
 *
 * Source of truth for sitter app structure.
 * Freeze this to prevent Cursor from reshuffling.
 */

export type FeatureStatus = 'live' | 'coming_soon' | 'beta';

export const SITTER_TABS = [
  { id: 'today', label: 'Today', href: '/sitter/today', icon: 'fas fa-calendar-day' },
  { id: 'calendar', label: 'Calendar', href: '/sitter/calendar', icon: 'fas fa-calendar-alt' },
  { id: 'inbox', label: 'Inbox', href: '/sitter/inbox', icon: 'fas fa-inbox' },
  { id: 'earnings', label: 'Earnings', href: '/sitter/earnings', icon: 'fas fa-wallet' },
  { id: 'profile', label: 'Profile', href: '/sitter/profile', icon: 'fas fa-user' },
] as const;

export const SITTER_PROFILE_LINKS = [
  { href: '/sitter/jobs', label: 'Jobs', icon: 'fas fa-briefcase' },
  { href: '/sitter/availability', label: 'Availability', icon: 'fas fa-calendar-check' },
  { href: '/sitter/pets', label: 'Pets', icon: 'fas fa-paw' },
  { href: '/sitter/reports', label: 'Reports', icon: 'fas fa-file-alt' },
  { href: '/sitter/performance', label: 'Performance', icon: 'fas fa-chart-line' },
  { href: '/sitter/training', label: 'Training', icon: 'fas fa-graduation-cap' },
] as const;

/** Feature status per module. Keys match route/feature identifiers. */
export const FEATURE_STATUS: Record<string, FeatureStatus> = {
  today: 'live',
  calendar: 'live',
  inbox: 'live',
  earnings: 'live',
  profile: 'live',
  jobs: 'live',
  pets: 'live',
  reports: 'coming_soon',
  availability: 'live',
  performance: 'coming_soon',
  training: 'coming_soon',
  route_optimization: 'coming_soon',
  ai_suggested_reply: 'coming_soon',
  instant_payout: 'coming_soon',
  badges: 'coming_soon',
  offline_mode: 'coming_soon',
  verification: 'coming_soon',
  documents: 'coming_soon',
  recurring_blocks: 'coming_soon',
};

export function getFeatureStatus(key: string): FeatureStatus {
  return FEATURE_STATUS[key] ?? 'coming_soon';
}

export function getStatusPill(status: FeatureStatus): { label: string; className: string } {
  switch (status) {
    case 'live':
      return { label: '✅ Live', className: 'bg-green-100 text-green-800' };
    case 'beta':
      return { label: '🧪 Beta', className: 'bg-blue-100 text-blue-800' };
    case 'coming_soon':
    default:
      return { label: '🚧 Coming soon', className: 'bg-amber-100 text-amber-800' };
  }
}
