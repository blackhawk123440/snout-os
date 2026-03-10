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

describe('GET /api/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestContext).mockResolvedValue({
      orgId: 'org-1',
      role: 'owner',
      userId: 'owner-1',
      clientId: null,
      sitterId: null,
    } as never);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestContext).mockRejectedValueOnce(new Error('no session'));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns owner booking list with report projection', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'b1',
        firstName: 'Client',
        lastName: 'One',
        phone: '+15550001',
        email: 'client@example.com',
        address: '123 Main',
        service: 'Dog Walk',
        startAt: new Date('2026-03-09T10:00:00.000Z'),
        endAt: new Date('2026-03-09T11:00:00.000Z'),
        status: 'completed',
        paymentStatus: 'unpaid',
        totalPrice: 45,
        sitter: { id: 's1', firstName: 'Sam', lastName: 'Sitter' },
        client: { id: 'c1', firstName: 'Client', lastName: 'One' },
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        reports: [{ id: 'r1', createdAt: new Date('2026-03-09T12:00:00.000Z') }],
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.bookings).toHaveLength(1);
    expect(body.bookings[0]).toEqual(
      expect.objectContaining({
        id: 'b1',
        status: 'completed',
        hasReport: true,
      })
    );
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startAt: 'asc' },
        take: 200,
      })
    );
  });
});
