import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const report = await (prisma as any).report.findFirst({
      where: {
        id,
        ...whereOrg(ctx.orgId, {}),
        booking: { clientId: ctx.clientId },
      },
      include: {
        booking: { select: { id: true, service: true, startAt: true, endAt: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const toIso = (d: Date | null) => (d instanceof Date ? d.toISOString() : null);
    return NextResponse.json({
      id: report.id,
      content: report.content,
      mediaUrls: report.mediaUrls,
      visitStarted: toIso(report.visitStarted),
      visitCompleted: toIso(report.visitCompleted),
      createdAt: toIso(report.createdAt),
      booking: report.booking
        ? {
            id: report.booking.id,
            service: report.booking.service,
            startAt: toIso(report.booking.startAt),
            endAt: toIso(report.booking.endAt),
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load report', message },
      { status: 500 }
    );
  }
}
