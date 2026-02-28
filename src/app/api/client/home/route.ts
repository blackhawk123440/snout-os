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
    return NextResponse.json({ error: 'Client profile missing on session' }, { status: 403 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [client, upcoming, recent, latestReport] = await Promise.all([
      (prisma as any).client.findFirst({
        where: whereOrg(ctx.orgId, { id: ctx.clientId }),
        select: { firstName: true, lastName: true },
      }),
      (prisma as any).booking.findMany({
        where: whereOrg(ctx.orgId, {
          clientId: ctx.clientId,
          status: { in: ['pending', 'confirmed', 'in_progress'] },
          startAt: { gte: now },
        }),
        select: { id: true, service: true, startAt: true, status: true },
        orderBy: { startAt: 'asc' },
        take: 5,
      }),
      (prisma as any).booking.findMany({
        where: whereOrg(ctx.orgId, { clientId: ctx.clientId }),
        select: { id: true, service: true, startAt: true, status: true },
        orderBy: { startAt: 'desc' },
        take: 10,
      }),
      (prisma as any).report.findFirst({
        where: {
          ...whereOrg(ctx.orgId, {}),
          booking: { clientId: ctx.clientId },
        },
        select: { id: true, content: true, createdAt: true, booking: { select: { service: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const clientName = client
      ? [client.firstName, client.lastName].filter(Boolean).join(' ') || null
      : null;

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    const recentBookings = recent.map((b: any) => ({
      id: b.id,
      service: b.service,
      startAt: toIso(b.startAt),
      status: b.status,
    }));

    const latestReportPayload = latestReport
      ? {
          id: latestReport.id,
          content: latestReport.content?.slice(0, 200) + (latestReport.content?.length > 200 ? '…' : ''),
          createdAt: toIso(latestReport.createdAt),
          service: latestReport.booking?.service,
        }
      : null;

    return NextResponse.json({
      clientName,
      upcomingCount: upcoming.length,
      recentBookings,
      latestReport: latestReportPayload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load home', message },
      { status: 500 }
    );
  }
}
