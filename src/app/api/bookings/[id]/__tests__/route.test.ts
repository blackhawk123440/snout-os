import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockStatusHistoryCreate = vi.fn();
const mockStripeChargeFindFirst = vi.fn();
const mockEnqueueCalendarSync = vi.fn().mockResolvedValue(undefined);
const mockEnsureEventQueueBridge = vi.fn().mockResolvedValue(undefined);
const mockEmitBookingUpdated = vi.fn().mockResolvedValue(undefined);

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
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    bookingStatusHistory: {
      create: (...args: unknown[]) => mockStatusHistoryCreate(...args),
    },
    stripeCharge: {
      findFirst: (...args: unknown[]) => mockStripeChargeFindFirst(...args),
    },
  })),
}));

vi.mock('@/lib/calendar-queue', () => ({
  enqueueCalendarSync: (...args: unknown[]) => mockEnqueueCalendarSync(...args),
}));

vi.mock('@/lib/event-queue-bridge-init', () => ({
  ensureEventQueueBridge: (...args: unknown[]) => mockEnsureEventQueueBridge(...args),
}));

vi.mock('@/lib/event-emitter', () => ({
  emitBookingUpdated: (...args: unknown[]) => mockEmitBookingUpdated(...args),
}));

import { GET, PATCH } from '@/app/api/bookings/[id]/route';
import { getRequestContext } from '@/lib/request-context';

describe('/api/bookings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestContext).mockResolvedValue({
      orgId: 'org-1',
      role: 'owner',
      userId: 'owner-1',
      sitterId: null,
      clientId: null,
    } as never);
  });

  it('GET returns payment and calendar proof surfaces', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'b1',
      firstName: 'Client',
      lastName: 'One',
      phone: '+14155550101',
      email: 'client@example.com',
      address: '123 Main',
      service: 'Dog Walk',
      startAt: new Date('2026-03-10T12:00:00.000Z'),
      endAt: new Date('2026-03-10T12:30:00.000Z'),
      status: 'confirmed',
      paymentStatus: 'paid',
      totalPrice: 35,
      notes: null,
      createdAt: new Date('2026-03-10T11:00:00.000Z'),
      updatedAt: new Date('2026-03-10T11:30:00.000Z'),
      sitter: {
        id: 's1',
        firstName: 'Sam',
        lastName: 'Sitter',
        calendarSyncEnabled: true,
        googleCalendarId: 'primary',
        googleAuthExpired: false,
        googleAuthError: null,
      },
      client: { id: 'c1', firstName: 'Client', lastName: 'One', email: 'client@example.com', phone: '+14155550101' },
      pets: [],
      reports: [],
      calendarEvents: [{
        googleCalendarEventId: 'abcdef1234567890',
        externalEventId: 'abcdef1234567890',
        syncedCalendarId: 'primary',
        syncStatus: 'SYNCED',
        lastSyncAttemptAt: new Date('2026-03-10T11:44:00.000Z'),
        lastSyncError: null,
        lastSyncedAt: new Date('2026-03-10T11:45:00.000Z'),
        updatedAt: new Date('2026-03-10T11:45:00.000Z'),
      }],
    });
    mockStripeChargeFindFirst.mockResolvedValueOnce({
      id: 'ch_123',
      amount: 3500,
      createdAt: new Date('2026-03-10T11:40:00.000Z'),
      currency: 'usd',
      paymentIntentId: 'pi_123',
    });

    const res = await GET(new Request('http://localhost/api/bookings/b1') as any, {
      params: Promise.resolve({ id: 'b1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.booking.paymentProof).toEqual(
      expect.objectContaining({
        status: 'paid',
        amount: 35,
        paymentReference: 'ch_123',
      })
    );
    expect(body.booking.calendarSyncProof).toEqual(
      expect.objectContaining({
        status: 'SYNCED',
        connectedCalendar: 'primary',
        externalEventId: expect.stringContaining('...'),
      })
    );
  });

  it('rejects unknown booking statuses', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'b1',
      status: 'pending',
      sitterId: 's1',
    });

    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'b1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid booking status');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockStatusHistoryCreate).not.toHaveBeenCalled();
  });

  it('serializes auth-expired calendar proof surface state', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'b1',
      firstName: 'Client',
      lastName: 'One',
      phone: '+14155550101',
      email: 'client@example.com',
      address: '123 Main',
      service: 'Dog Walk',
      startAt: new Date('2026-03-10T12:00:00.000Z'),
      endAt: new Date('2026-03-10T12:30:00.000Z'),
      status: 'confirmed',
      paymentStatus: 'paid',
      totalPrice: 35,
      notes: null,
      createdAt: new Date('2026-03-10T11:00:00.000Z'),
      updatedAt: new Date('2026-03-10T11:30:00.000Z'),
      sitter: {
        id: 's1',
        firstName: 'Sam',
        lastName: 'Sitter',
        calendarSyncEnabled: true,
        googleCalendarId: 'primary',
        googleAuthExpired: true,
        googleAuthError: 'invalid_grant',
      },
      client: { id: 'c1', firstName: 'Client', lastName: 'One', email: 'client@example.com', phone: '+14155550101' },
      pets: [],
      reports: [],
      calendarEvents: [{
        googleCalendarEventId: null,
        externalEventId: null,
        syncedCalendarId: 'primary',
        syncStatus: 'AUTH_EXPIRED',
        lastSyncAttemptAt: new Date('2026-03-10T11:44:00.000Z'),
        lastSyncError: 'invalid_grant',
        lastSyncedAt: null,
        updatedAt: new Date('2026-03-10T11:45:00.000Z'),
      }],
    });
    mockStripeChargeFindFirst.mockResolvedValueOnce(null);

    const res = await GET(new Request('http://localhost/api/bookings/b1') as any, {
      params: Promise.resolve({ id: 'b1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.booking.calendarSyncProof).toEqual(
      expect.objectContaining({
        status: 'AUTH_EXPIRED',
        syncError: 'invalid_grant',
      })
    );
  });

  it('rejects invalid status transitions', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'b1',
      status: 'completed',
      sitterId: 's1',
    });

    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'b1' }) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('Invalid booking status transition');
    expect(body.from).toBe('completed');
    expect(body.to).toBe('in_progress');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockStatusHistoryCreate).not.toHaveBeenCalled();
  });

  it('accepts valid status transition and writes history', async () => {
    mockFindFirst
      .mockResolvedValueOnce({
        id: 'b1',
        status: 'pending',
        sitterId: 's1',
      })
      .mockResolvedValueOnce({
        id: 'b1',
      });
    mockUpdate.mockResolvedValueOnce({
      id: 'b1',
      status: 'confirmed',
      sitterId: 's1',
      updatedAt: new Date('2026-03-09T00:00:00.000Z'),
    });
    mockStatusHistoryCreate.mockResolvedValueOnce({});

    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'b1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.booking.status).toBe('confirmed');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({ status: 'confirmed' }),
      })
    );
    expect(mockStatusHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 'b1',
          fromStatus: 'pending',
          toStatus: 'confirmed',
          reason: 'owner_operator_update',
        }),
      })
    );
  });

  it('reassignment enqueues delete and upsert actions', async () => {
    mockFindFirst
      .mockResolvedValueOnce({
        id: 'b1',
        status: 'confirmed',
        sitterId: 's1',
      })
      .mockResolvedValueOnce({
        id: 'b1',
      });
    mockUpdate.mockResolvedValueOnce({
      id: 'b1',
      status: 'confirmed',
      sitterId: 's2',
      updatedAt: new Date('2026-03-09T00:00:00.000Z'),
    });

    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ sitterId: 's2' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'b1' }) });

    expect(res.status).toBe(200);
    expect(mockEnqueueCalendarSync).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'delete', bookingId: 'b1', sitterId: 's1', action: 'reassignment' })
    );
    expect(mockEnqueueCalendarSync).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'upsert', bookingId: 'b1', action: 'reassignment' })
    );
  });

  it('cancellation enqueues delete with cancellation action', async () => {
    mockFindFirst
      .mockResolvedValueOnce({
        id: 'b1',
        status: 'confirmed',
        sitterId: 's1',
      })
      .mockResolvedValueOnce({
        id: 'b1',
      });
    mockUpdate.mockResolvedValueOnce({
      id: 'b1',
      status: 'cancelled',
      sitterId: 's1',
      updatedAt: new Date('2026-03-09T00:00:00.000Z'),
    });

    const req = new Request('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'b1' }) });

    expect(res.status).toBe(200);
    expect(mockEnqueueCalendarSync).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'delete', bookingId: 'b1', sitterId: 's1', action: 'cancellation' })
    );
  });
});
