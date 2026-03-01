/**
 * GET /api/ops/metrics
 * Owner metrics for real-time dashboard (poll every 10-30s)
 * Returns: activeVisitsCount, openBookingsCount, revenueYTD, retentionRate
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['owner', 'admin']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = ctx.orgId;
  const now = new Date();
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  try {
    // Active visits: in_progress bookings (sitter checked in)
    const activeVisitsCount = await prisma.booking.count({
      where: whereOrg(orgId, { status: 'in_progress' }),
    });

    // Open bookings: pending, confirmed, in_progress (not completed/cancelled)
    const openBookingsCount = await prisma.booking.count({
      where: whereOrg(orgId, {
        status: { in: ['pending', 'confirmed', 'in_progress'] },
      }),
    });

    // Revenue YTD: from paid bookings or StripeCharge
    const [paidBookingsSum, stripeChargesSum] = await Promise.all([
      prisma.booking.aggregate({
        where: whereOrg(orgId, {
          paymentStatus: 'paid',
          startAt: { gte: ytdStart },
        }),
        _sum: { totalPrice: true },
      }),
      prisma.stripeCharge.aggregate({
        where: {
          orgId,
          status: 'succeeded',
          createdAt: { gte: ytdStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const bookingRevenue = paidBookingsSum._sum.totalPrice ?? 0;
    const stripeRevenueCents = stripeChargesSum._sum.amount ?? 0;
    const revenueYTD = Math.max(bookingRevenue, stripeRevenueCents / 100);

    // Retention rate: clients with 2+ bookings in last 90d / clients with 1+ booking in last 90d
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const clientsWithBookings = await prisma.booking.groupBy({
      by: ['clientId'],
      where: whereOrg(orgId, {
        startAt: { gte: ninetyDaysAgo },
        clientId: { not: null },
      }),
      _count: { id: true },
    });

    const totalClients = clientsWithBookings.length;
    const returningClients = clientsWithBookings.filter((c) => (c._count.id ?? 0) >= 2).length;
    const retentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;

    return NextResponse.json({
      activeVisitsCount,
      openBookingsCount,
      revenueYTD: Math.round(revenueYTD * 100) / 100,
      retentionRate: Math.round(retentionRate * 10) / 10,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load metrics', message },
      { status: 500 }
    );
  }
}
