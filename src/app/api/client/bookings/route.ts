import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

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

  try {
    const bookings = await (prisma as any).booking.findMany({
      where: whereOrg(ctx.orgId, { clientId: ctx.clientId }),
      select: { id: true, service: true, startAt: true, endAt: true, status: true, address: true },
      orderBy: { startAt: 'desc' },
      take: 50,
    });

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    const payload = bookings.map((b: any) => ({
      id: b.id,
      service: b.service,
      startAt: toIso(b.startAt),
      endAt: toIso(b.endAt),
      status: b.status,
      address: b.address,
    }));

    return NextResponse.json({ bookings: payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load bookings', message },
      { status: 500 }
    );
  }
}
