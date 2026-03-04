import { describe, expect, it } from 'vitest';
import {
  getBookingPrimaryAction,
  getOptimisticStatus,
  shouldRenderCopyAddress,
  shouldRenderMail,
  shouldRenderTel,
} from '@/app/sitter/bookings/[id]/booking-detail-helpers';

describe('booking detail helpers', () => {
  it('selects primary action from booking state', () => {
    expect(getBookingPrimaryAction('pending', false)).toBe('start');
    expect(getBookingPrimaryAction('confirmed', false)).toBe('start');
    expect(getBookingPrimaryAction('in_progress', false)).toBe('end');
    expect(getBookingPrimaryAction('completed', false)).toBe('write_report');
    expect(getBookingPrimaryAction('completed', true)).toBe('view_report');
  });

  it('renders tel/mailto/copy controls only when values exist', () => {
    expect(shouldRenderTel(null)).toBe(false);
    expect(shouldRenderTel('')).toBe(false);
    expect(shouldRenderTel('+15551234567')).toBe(true);

    expect(shouldRenderMail(null)).toBe(false);
    expect(shouldRenderMail('')).toBe(false);
    expect(shouldRenderMail('client@example.com')).toBe(true);

    expect(shouldRenderCopyAddress(null)).toBe(false);
    expect(shouldRenderCopyAddress('')).toBe(false);
    expect(shouldRenderCopyAddress('123 Main St')).toBe(true);
  });

  it('returns optimistic status transitions for start/end visit', () => {
    expect(getOptimisticStatus('confirmed', 'start')).toBe('in_progress');
    expect(getOptimisticStatus('in_progress', 'end')).toBe('completed');
  });
});
