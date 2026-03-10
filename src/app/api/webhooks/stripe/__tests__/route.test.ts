import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const constructEventMock = vi.fn();

vi.mock('stripe', () => ({
  default: class Stripe {
    webhooks = {
      constructEvent: (...args: unknown[]) => constructEventMock(...args),
    };
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    ENABLE_WEBHOOK_VALIDATION: true,
  },
}));

vi.mock('@/lib/tenancy', () => ({
  getScopedDb: vi.fn(() => ({})),
}));

vi.mock('@/lib/bookings/booking-confirmed-handler', () => ({
  onBookingConfirmed: vi.fn(),
}));

vi.mock('@/lib/log-event', () => ({
  logEvent: vi.fn(async () => {}),
}));

vi.mock('@/lib/stripe-webhook-persist', () => ({
  persistPaymentSucceeded: vi.fn(async () => {}),
  persistPaymentFailed: vi.fn(async () => {}),
  persistRefund: vi.fn(async () => {}),
}));

import { POST } from '@/app/api/webhooks/stripe/route';

describe('POST /api/webhooks/stripe verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test';
  });

  it('accepts valid stripe signature', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'customer.created',
      data: { object: {} },
    });

    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_1' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ received: true });
  });

  it('rejects invalid stripe signature', async () => {
    constructEventMock.mockImplementationOnce(() => {
      throw new Error('signature verification failed');
    });

    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'bad_sig',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
