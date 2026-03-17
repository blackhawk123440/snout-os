import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { logEvent } from '@/lib/log-event';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const booking = await (prisma as any).booking.findFirst({
      where: { id, ...whereOrg(ctx.orgId, { clientId: ctx.clientId }) },
      select: {
        id: true, status: true, startAt: true, sitterId: true,
        firstName: true, lastName: true, service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a booking that is ${booking.status}` },
        { status: 400 }
      );
    }

    if (new Date(booking.startAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Cannot cancel a booking that has already started' },
        { status: 400 }
      );
    }

    await (prisma as any).booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await (prisma as any).bookingStatusHistory.create({
      data: {
        orgId: ctx.orgId,
        bookingId: id,
        fromStatus: booking.status,
        toStatus: 'cancelled',
        changedBy: ctx.userId ?? null,
        reason: 'client_cancelled',
      },
    });

    // Notify sitter + owner
    if (booking.sitterId) {
      void import('@/lib/notifications/triggers').then(({ notifySitterBookingCancelled }) => {
        notifySitterBookingCancelled({
          orgId: ctx.orgId,
          bookingId: id,
          sitterId: booking.sitterId,
          clientName: `${booking.firstName} ${booking.lastName}`.trim(),
          service: booking.service,
          startAt: booking.startAt,
        });
      }).catch(() => {});
    }

    await logEvent({
      orgId: ctx.orgId,
      action: 'booking.cancelled_by_client',
      bookingId: id,
      status: 'success',
    });

    const isWithin24h = new Date(booking.startAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

    return NextResponse.json({ success: true, within24h: isWithin24h });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to cancel', message }, { status: 500 });
  }
}
