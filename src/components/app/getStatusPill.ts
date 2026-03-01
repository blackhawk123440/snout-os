/**
 * getStatusPill - Consistent status pill styling
 * Maps common status strings to visual variants.
 */

export type StatusPillVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface StatusPillConfig {
  variant: StatusPillVariant;
  label: string;
}

const STATUS_MAP: Record<string, StatusPillConfig> = {
  // Booking
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  in_progress: { variant: 'info', label: 'In progress' },
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
  const normalized = String(status || '').toLowerCase().replace(/\s+/g, '_');
  return STATUS_MAP[normalized] ?? { variant: 'default', label: status || '—' };
}
