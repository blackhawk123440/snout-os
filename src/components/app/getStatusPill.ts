/**
 * getStatusPill - Consistent status pill styling (single source of truth)
 * Maps common status strings to visual variants. Use everywhere - no page-specific status names.
 */

export type StatusPillVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface StatusPillConfig {
  variant: StatusPillVariant;
  label: string;
}

const STATUS_MAP: Record<string, StatusPillConfig> = {
  // Booking (canonical: pending, confirmed, in_progress, completed, cancelled)
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  in_progress: { variant: 'info', label: 'In progress' },
  'in-progress': { variant: 'info', label: 'In progress' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  // Payment
  paid: { variant: 'success', label: 'Paid' },
  unpaid: { variant: 'warning', label: 'Unpaid' },
  partial: { variant: 'warning', label: 'Partial' },
  // Dispatch
  auto: { variant: 'default', label: 'Auto' },
  manual_required: { variant: 'warning', label: 'Needs attention' },
  manual_in_progress: { variant: 'info', label: 'In progress' },
  assigned: { variant: 'success', label: 'Assigned' },
  // Generic
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'default', label: 'Inactive' },
  draft: { variant: 'default', label: 'Draft' },
  failed: { variant: 'error', label: 'Failed' },
};

export function getStatusPill(status: string): StatusPillConfig {
  const s = String(status || '').toLowerCase().trim();
  const normalized = s.replace(/\s+/g, '_').replace(/-/g, '_');
  return STATUS_MAP[s] ?? STATUS_MAP[normalized] ?? { variant: 'default', label: status || '—' };
}

/** Canonical booking status labels - use instead of hardcoding */
export function getBookingStatusLabel(status: string): string {
  return getStatusPill(status).label;
}
