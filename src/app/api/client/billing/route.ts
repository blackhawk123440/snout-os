/**
 * GET /api/client/billing
 * Returns unpaid invoices (bookings with payment links) and loyalty points
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.clientId) {
    return NextResponse.json({ error: 'Client profile missing' }, { status: 403 });
  }

  try {
    const [unpaidBookings, loyalty] = await Promise.all([
      prisma.booking.findMany({
        where: whereOrg(ctx.orgId, {
          clientId: ctx.clientId,
          paymentStatus: { not: 'paid' },
          status: { not: 'cancelled' },
        }),
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
      prisma.loyaltyReward.findFirst({
        where: { orgId: ctx.orgId, clientId: ctx.clientId },
        select: { points: true, tier: true },
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

    return NextResponse.json({
      invoices,
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
