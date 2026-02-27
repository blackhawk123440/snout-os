import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * GET /api/sitter/earnings
 * Returns earnings summary for the current sitter. Requires SITTER role.
 * MVP: simple totals from completed bookings, no payments.
 */
export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'sitter');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.sitterId) {
    return NextResponse.json({ error: 'Sitter profile missing on session' }, { status: 403 });
  }

  try {
    const sitter = await prisma.sitter.findUnique({
      where: whereOrg(ctx.orgId, { id: ctx.sitterId }),
      select: { commissionPercentage: true },
    });

    if (!sitter) {
      return NextResponse.json({ error: 'Sitter not found' }, { status: 404 });
    }

    const commissionPct = sitter.commissionPercentage ?? 80;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [completedAll, completedThisMonth, completedLastMonth] = await Promise.all([
      prisma.booking.aggregate({
        where: whereOrg(ctx.orgId, {
          sitterId: ctx.sitterId,
          status: 'completed',
        }),
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: whereOrg(ctx.orgId, {
          sitterId: ctx.sitterId,
          status: 'completed',
          endAt: { gte: startOfMonth },
        }),
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: whereOrg(ctx.orgId, {
          sitterId: ctx.sitterId,
          status: 'completed',
          endAt: { gte: startOfLastMonth, lt: startOfMonth },
        }),
        _sum: { totalPrice: true },
        _count: true,
      }),
    ]);

    const grossTotal = completedAll._sum.totalPrice ?? 0;
    const grossThisMonth = completedThisMonth._sum.totalPrice ?? 0;
    const grossLastMonth = completedLastMonth._sum.totalPrice ?? 0;
    const earningsTotal = grossTotal * (commissionPct / 100);
    const earningsThisMonth = grossThisMonth * (commissionPct / 100);
    const earningsLastMonth = grossLastMonth * (commissionPct / 100);

    return NextResponse.json({
      commissionPercentage: commissionPct,
      grossTotal: Math.round(grossTotal * 100) / 100,
      earningsTotal: Math.round(earningsTotal * 100) / 100,
      grossThisMonth: Math.round(grossThisMonth * 100) / 100,
      earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
      grossLastMonth: Math.round(grossLastMonth * 100) / 100,
      earningsLastMonth: Math.round(earningsLastMonth * 100) / 100,
      completedBookingsCount: completedAll._count,
      completedThisMonthCount: completedThisMonth._count,
      completedLastMonthCount: completedLastMonth._count,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load earnings', message },
      { status: 500 }
    );
  }
}
