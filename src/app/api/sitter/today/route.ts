import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['sitter']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.sitterId) {
    return NextResponse.json({ error: 'Sitter profile missing on session' }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  try {
    const bookings = await (prisma as any).booking.findMany({
      where: whereOrg(ctx.orgId, {
        sitterId: ctx.sitterId,
        startAt: { gte: todayStart, lt: tomorrowStart },
        status: { not: 'cancelled' },
      }),
      include: {
        pets: {
          select: {
            id: true,
            name: true,
            species: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    const bookingIds = bookings.map((booking: any) => booking.id);
    const threadMap = new Map<string, string>();

    if (bookingIds.length > 0) {
      const threads = await prisma.messageThread.findMany({
        where: whereOrg(ctx.orgId, {
          bookingId: { in: bookingIds },
          assignedSitterId: ctx.sitterId,
        }),
        select: {
          id: true,
          bookingId: true,
        },
      });

      for (const thread of threads) {
        if (thread.bookingId) {
          threadMap.set(thread.bookingId, thread.id);
        }
      }
    }

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    const payload = bookings.map((booking: any) => ({
      id: booking.id,
      status: booking.status,
      service: booking.service,
      startAt: toIso(booking.startAt),
      endAt: toIso(booking.endAt),
      address: booking.address,
      clientName:
        `${booking.client?.firstName || booking.firstName || ''} ${booking.client?.lastName || booking.lastName || ''}`.trim() ||
        'Client',
      pets: booking.pets || [],
      threadId: threadMap.get(booking.id) || null,
    }));

    return NextResponse.json({ bookings: payload }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load today bookings', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
