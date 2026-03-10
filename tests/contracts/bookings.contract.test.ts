import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindMany = vi.fn();

vi.mock('@/lib/request-context', () => ({
  getRequestContext: vi.fn(),
}));

vi.mock('@/lib/rbac', () => ({
  requireAnyRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('@/lib/tenancy', () => ({
  getScopedDb: vi.fn(() => ({
    booking: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  })),
}));

import { GET } from '@/app/api/bookings/route';
import { getRequestContext } from '@/lib/request-context';

describe('bookings API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestContext).mockResolvedValue({
      orgId: 'org-1',
      role: 'owner',
      userId: 'user-1',
      clientId: null,
      sitterId: null,
    } as never);
  });

  it('returns canonical bookings shape using paymentStatus', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'b1',
        firstName: 'Casey',
        lastName: 'Client',
        phone: '+14155550101',
        email: 'casey@example.com',
        address: '123 Main St',
        service: 'Dog Walk',
        startAt: new Date('2026-03-10T10:00:00.000Z'),
        endAt: new Date('2026-03-10T10:30:00.000Z'),
        status: 'confirmed',
        paymentStatus: 'unpaid',
        totalPrice: 35,
        sitter: { id: 's1', firstName: 'Sam', lastName: 'Sitter' },
        client: { id: 'c1', firstName: 'Casey', lastName: 'Client' },
        createdAt: new Date('2026-03-09T08:00:00.000Z'),
        reports: [],
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.bookings)).toBe(true);
    expect(body.bookings).toHaveLength(1);

    const booking = body.bookings[0];
    expect(booking).toMatchObject({
      id: 'b1',
      firstName: 'Casey',
      lastName: 'Client',
      status: 'confirmed',
      paymentStatus: 'unpaid',
    });
    expect(Object.keys(booking)).toContain('paymentStatus');
    expect(Object.keys(booking)).not.toContain('paidStatus');
  });
});
