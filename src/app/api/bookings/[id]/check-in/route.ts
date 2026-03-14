import { NextResponse } from 'next/server';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { emitSitterCheckedIn } from '@/lib/event-emitter';
import { publish, channels } from '@/lib/realtime/bus';
import { syncConversationLifecycleWithBookingWorkflow } from '@/lib/messaging/conversation-service';
import { emitClientLifecycleNoticeIfNeeded } from '@/lib/messaging/lifecycle-client-copy';

/**
 * POST /api/bookings/[id]/check-in
 * Updates booking status to in_progress for sitter check-in. Requires SITTER role.
 * Accepts optional body: { lat?: number; lng?: number } for GPS capture.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const db = getScopedDb(ctx);

  try {
    const booking = await db.booking.findFirst({
      where: { id, sitterId: ctx.sitterId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot check in: booking is ${booking.status}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;

    await db.booking.update({
      where: { id },
      data: { status: 'in_progress' },
    });
    const lifecycleSync = await syncConversationLifecycleWithBookingWorkflow({
      orgId: ctx.orgId,
      bookingId: booking.id,
      clientId: booking.clientId,
      phone: booking.phone,
      firstName: booking.firstName,
      lastName: booking.lastName,
      sitterId: booking.sitterId,
      bookingStatus: 'in_progress',
      serviceWindowStart: booking.startAt,
      serviceWindowEnd: booking.endAt,
    }).catch((error) => {
      console.error('[check-in] lifecycle sync failed:', error);
      return null;
    });
    if (lifecycleSync?.threadId) {
      void emitClientLifecycleNoticeIfNeeded({
        orgId: ctx.orgId,
        threadId: lifecycleSync.threadId,
        notice: 'service_activated',
        dedupeKey: `${booking.id}:checkin`,
      }).catch(() => {});
    }

    const existingVisitEvent = await db.visitEvent.findFirst({
      where: { bookingId: id, sitterId: ctx.sitterId, orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (existingVisitEvent) {
      await db.visitEvent.update({
        where: { id: existingVisitEvent.id },
        data: {
          checkInAt: new Date(),
          status: 'in_progress',
        },
      });
    } else {
      await db.visitEvent.create({
        data: {
          orgId: ctx.orgId,
          sitterId: ctx.sitterId,
          clientId: booking.clientId ?? null,
          bookingId: booking.id,
          scheduledStart: booking.startAt,
          scheduledEnd: booking.endAt,
          checkInAt: new Date(),
          status: 'in_progress',
        },
      });
    }

    if (lat != null && lng != null) {
      await db.eventLog.create({
        data: {
          orgId: ctx.orgId,
          eventType: 'sitter.check_in',
          status: 'success',
          bookingId: id,
          metadata: JSON.stringify({ lat, lng, sitterId: ctx.sitterId }),
        },
      });
    }

    const updated = await db.booking.findUnique({
      where: { id },
      include: { sitter: true },
    });
    if (updated?.sitter) {
      await emitSitterCheckedIn(updated, updated.sitter);
    }

    if (updated?.sitterId) {
      publish(channels.sitterToday(updated.orgId ?? ctx.orgId, updated.sitterId), {
        type: 'visit.checkin',
        bookingId: id,
        ts: Date.now(),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, status: 'in_progress' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Check-in failed', message },
      { status: 500 }
    );
  }
}
