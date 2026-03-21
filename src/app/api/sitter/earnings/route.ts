import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * GET /api/sitter/earnings
 * Returns earnings summary for the current sitter. Requires SITTER role.
 * Optional query params: from, to (ISO date strings) for custom period filtering.
 */
export async function GET(request: NextRequest) {
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

    // Optional custom period
    const fromParam = request.nextUrl.searchParams.get('from');
    const toParam = request.nextUrl.searchParams.get('to');
    let periodFrom: Date | null = null;
    let periodTo: Date | null = null;

    if (fromParam) {
      periodFrom = new Date(fromParam);
      if (isNaN(periodFrom.getTime())) {
        return NextResponse.json({ error: 'Invalid "from" date' }, { status: 400 });
      }
      periodTo = toParam ? new Date(toParam) : new Date();
      if (isNaN(periodTo.getTime())) {
        return NextResponse.json({ error: 'Invalid "to" date' }, { status: 400 });
      }
      if (periodFrom > periodTo) {
        return NextResponse.json({ error: '"from" must be before "to"' }, { status: 400 });
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const queries: Promise<any>[] = [
      prisma.booking.aggregate({
        where: whereOrg(ctx.orgId, { sitterId: ctx.sitterId, status: 'completed' }),
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: whereOrg(ctx.orgId, { sitterId: ctx.sitterId, status: 'completed', endAt: { gte: startOfMonth } }),
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.booking.aggregate({
        where: whereOrg(ctx.orgId, { sitterId: ctx.sitterId, status: 'completed', endAt: { gte: startOfLastMonth, lt: startOfMonth } }),
        _sum: { totalPrice: true },
        _count: true,
      }),
    ];

    if (periodFrom && periodTo) {
      queries.push(
        prisma.booking.aggregate({
          where: whereOrg(ctx.orgId, { sitterId: ctx.sitterId, status: 'completed', endAt: { gte: periodFrom, lte: periodTo } }),
          _sum: { totalPrice: true },
          _count: true,
        })
      );
    }

    const results = await Promise.all(queries);
    const [completedAll, completedThisMonth, completedLastMonth] = results;
    const completedPeriod = results[3] ?? null;

    const grossTotal = completedAll._sum.totalPrice ?? 0;
    const grossThisMonth = completedThisMonth._sum.totalPrice ?? 0;
    const grossLastMonth = completedLastMonth._sum.totalPrice ?? 0;
    const earningsTotal = grossTotal * (commissionPct / 100);
    const earningsThisMonth = grossThisMonth * (commissionPct / 100);
    const earningsLastMonth = grossLastMonth * (commissionPct / 100);

    const completedCount = completedAll._count;
    const avgPerVisit = completedCount > 0 ? earningsTotal / completedCount : 0;

    const response: Record<string, any> = {
      commissionPercentage: commissionPct,
      grossTotal: Math.round(grossTotal * 100) / 100,
      earningsTotal: Math.round(earningsTotal * 100) / 100,
      grossThisMonth: Math.round(grossThisMonth * 100) / 100,
      earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
      grossLastMonth: Math.round(grossLastMonth * 100) / 100,
      earningsLastMonth: Math.round(earningsLastMonth * 100) / 100,
      completedBookingsCount: completedCount,
      completedThisMonthCount: completedThisMonth._count,
      completedLastMonthCount: completedLastMonth._count,
      averagePerVisit: Math.round(avgPerVisit * 100) / 100,
    };

    if (completedPeriod) {
      const periodGross = completedPeriod._sum.totalPrice ?? 0;
      response.periodGross = Math.round(periodGross * 100) / 100;
      response.periodEarnings = Math.round(periodGross * (commissionPct / 100) * 100) / 100;
      response.periodCount = completedPeriod._count;
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load earnings', message },
      { status: 500 }
    );
  }
}
