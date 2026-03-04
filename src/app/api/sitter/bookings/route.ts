/**
 * GET /api/sitter/bookings
 * Returns upcoming and recent bookings for the current sitter. Requires SITTER role.
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
    requireRole(ctx, 'sitter');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let sitterId = ctx.sitterId;
    if (!sitterId && ctx.userId) {
      const user = await prisma.user.findFirst({
        where: whereOrg(ctx.orgId, { id: ctx.userId }),
        select: { sitterId: true },
      });
      sitterId = user?.sitterId ?? null;
    }

    if (!sitterId) {
      console.warn('[api/sitter/bookings] Missing sitter context for authenticated user', {
        orgId: ctx.orgId,
        userId: ctx.userId,
      });
      return NextResponse.json(
        { error: 'Sitter profile not found for user' },
        { status: 403 }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookings = await (prisma as any).booking.findMany({
      where: whereOrg(ctx.orgId, {
        sitterId,
        status: { not: 'cancelled' },
        startAt: { gte: thirtyDaysAgo },
      }),
      include: {
        pets: { select: { id: true, name: true, species: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startAt: 'desc' },
      take: 50,
    });

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    const payload = bookings.map((b: any) => ({
      id: b.id,
      status: b.status,
      service: b.service,
      startAt: toIso(b.startAt),
      endAt: toIso(b.endAt),
      address: b.address,
      clientName:
        `${b.client?.firstName || ''} ${b.client?.lastName || ''}`.trim() || 'Client',
      pets: b.pets || [],
    }));

    return NextResponse.json({ bookings: payload }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/sitter/bookings] Failed to load bookings', {
      orgId: ctx.orgId,
      userId: ctx.userId,
      sitterId: ctx.sitterId,
      message,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to load bookings', message },
      { status: 500 }
    );
  }
}
