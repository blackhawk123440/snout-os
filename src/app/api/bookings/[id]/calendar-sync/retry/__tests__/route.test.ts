import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindFirst = vi.fn();
const mockEnqueueCalendarSync = vi.fn().mockResolvedValue('job-1');

vi.mock('@/lib/request-context', () => ({
  getRequestContext: vi.fn().mockResolvedValue({
    orgId: 'org-1',
    role: 'owner',
    userId: 'u1',
  }),
}));

vi.mock('@/lib/rbac', () => ({
  requireAnyRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('@/lib/tenancy', () => ({
  getScopedDb: vi.fn(() => ({
    booking: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  })),
}));

vi.mock('@/lib/calendar-queue', () => ({
  enqueueCalendarSync: (...args: unknown[]) => mockEnqueueCalendarSync(...args),
}));

import { POST } from '@/app/api/bookings/[id]/calendar-sync/retry/route';

describe('POST /api/bookings/[id]/calendar-sync/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requeues calendar upsert retry for owner', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'b1', sitterId: 's1', status: 'confirmed' });
    const res = await POST(new Request('http://localhost') as any, {
      params: Promise.resolve({ id: 'b1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockEnqueueCalendarSync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'upsert',
        bookingId: 'b1',
        orgId: 'org-1',
        action: 'retry',
      })
    );
  });

  it('blocks retry for cancelled bookings', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'b1', sitterId: 's1', status: 'cancelled' });
    const res = await POST(new Request('http://localhost') as any, {
      params: Promise.resolve({ id: 'b1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain('Cancelled');
    expect(mockEnqueueCalendarSync).not.toHaveBeenCalled();
  });
});
