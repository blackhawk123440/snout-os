import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    booking: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    stripeCharge: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/request-context', () => ({
  getRequestContext: vi.fn(),
}));

vi.mock('@/lib/rbac', () => ({
  requireRole: vi.fn(),
  requireClientContext: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('@/lib/org-scope', () => ({
  whereOrg: (_orgId: string, where: unknown) => ({ orgId: _orgId, ...(where as object) }),
}));

import { GET } from '@/app/api/client/bookings/[id]/route';
import { getRequestContext } from '@/lib/request-context';
import { prisma } from '@/lib/db';

describe('GET /api/client/bookings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestContext).mockResolvedValue({
      orgId: 'org-1',
      role: 'client',
      clientId: 'client-1',
      userId: 'user-1',
      sitterId: null,
    } as never);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestContext).mockRejectedValueOnce(new Error('no session'));

    const res = await GET(new Request('http://localhost/api/client/bookings/b1') as any, {
      params: Promise.resolve({ id: 'b1' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when booking is outside org/client scope', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await GET(new Request('http://localhost/api/client/bookings/foreign') as any, {
      params: Promise.resolve({ id: 'foreign' }),
    });

    expect(res.status).toBe(404);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: 'org-1', id: 'foreign', clientId: 'client-1' },
      })
    );
  });

  it('returns booking details with pets for in-scope booking', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'b1',
      service: 'Dog Walk',
      startAt: new Date('2026-03-09T10:00:00.000Z'),
      endAt: new Date('2026-03-09T11:00:00.000Z'),
      status: 'completed',
      paymentStatus: 'paid',
      totalPrice: 35,
      address: '123 Main St',
      pets: [{ id: 'p1', name: 'Milo', species: 'dog' }],
    });
    (prisma as any).stripeCharge.findFirst.mockResolvedValueOnce({
      id: 'ch_123',
      amount: 3500,
      createdAt: new Date('2026-03-09T11:05:00.000Z'),
      currency: 'usd',
      paymentIntentId: 'pi_123',
    });

    const res = await GET(new Request('http://localhost/api/client/bookings/b1') as any, {
      params: Promise.resolve({ id: 'b1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      id: 'b1',
      service: 'Dog Walk',
      startAt: '2026-03-09T10:00:00.000Z',
      endAt: '2026-03-09T11:00:00.000Z',
      status: 'completed',
      paymentStatus: 'paid',
      totalPrice: 35,
      address: '123 Main St',
      pets: [{ id: 'p1', name: 'Milo', species: 'dog' }],
      paymentProof: expect.objectContaining({
        status: 'paid',
        amount: 35,
        bookingReference: 'b1',
        invoiceReference: 'ch_123',
      }),
    });
  });
});
