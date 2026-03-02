/**
 * GET /api/client/billing
 * Returns unpaid invoices (bookings with payment links) and loyalty points
 */

import { NextResponse } from 'next/server';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getScopedDb(ctx);
  try {
    const [unpaidBookings, loyalty, paymentHistory] = await Promise.all([
      db.booking.findMany({
        where: {
          clientId: ctx.clientId,
          paymentStatus: { not: 'paid' },
          status: { not: 'cancelled' },
        },
        select: {
          id: true,
          service: true,
          startAt: true,
          totalPrice: true,
          stripePaymentLinkUrl: true,
          paymentStatus: true,
        },
        orderBy: { startAt: 'desc' },
        take: 20,
      }),
      db.loyaltyReward.findFirst({
        where: { clientId: ctx.clientId },
        select: { points: true, tier: true },
      }),
      db.stripeCharge.findMany({
        where: { clientId: ctx.clientId },
        select: { id: true, amount: true, status: true, createdAt: true, bookingId: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const invoices = unpaidBookings.map((b) => ({
      id: b.id,
      service: b.service,
      startAt: b.startAt instanceof Date ? b.startAt.toISOString() : b.startAt,
      totalPrice: b.totalPrice,
      paymentLink: b.stripePaymentLinkUrl,
      paymentStatus: b.paymentStatus,
    }));

    const payments = (paymentHistory || []).map((p: any) => ({
      id: p.id,
      amount: p.amount / 100,
      status: p.status,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      bookingId: p.bookingId,
    }));

    return NextResponse.json({
      invoices,
      payments,
      loyalty: loyalty
        ? { points: loyalty.points, tier: loyalty.tier }
        : { points: 0, tier: 'bronze' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load billing', message },
      { status: 500 }
    );
  }
}
