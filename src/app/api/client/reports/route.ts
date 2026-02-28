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
    const reports = await (prisma as any).report.findMany({
      where: {
        ...whereOrg(ctx.orgId, {}),
        booking: { clientId: ctx.clientId },
      },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        visitStarted: true,
        visitCompleted: true,
        createdAt: true,
        bookingId: true,
        booking: { select: { id: true, service: true, startAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const toIso = (d: Date | null) => (d instanceof Date ? d.toISOString() : null);
    const payload = reports.map((r: any) => ({
      id: r.id,
      content: r.content,
      mediaUrls: r.mediaUrls,
      visitStarted: toIso(r.visitStarted),
      visitCompleted: toIso(r.visitCompleted),
      createdAt: toIso(r.createdAt),
      bookingId: r.bookingId,
      booking: r.booking
        ? { id: r.booking.id, service: r.booking.service, startAt: toIso(r.booking.startAt) }
        : null,
    }));

    return NextResponse.json({ reports: payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load reports', message },
      { status: 500 }
    );
  }
}
