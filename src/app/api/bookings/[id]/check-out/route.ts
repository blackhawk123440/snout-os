import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { emitVisitCompleted } from '@/lib/event-emitter';
import { ensureEventQueueBridge } from '@/lib/event-queue-bridge-init';

/**
 * POST /api/bookings/[id]/check-out
 * Updates booking status to completed for sitter check-out. Requires SITTER role.
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

  try {
    const booking = await prisma.booking.findFirst({
      where: whereOrg(ctx.orgId, {
        id,
        sitterId: ctx.sitterId,
      }),
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot check out: booking is ${booking.status}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;

    await prisma.booking.update({
      where: { id },
      data: { status: 'completed' },
    });

    if (lat != null && lng != null) {
      await prisma.eventLog.create({
        data: {
          orgId: ctx.orgId,
          eventType: 'sitter.check_out',
          status: 'success',
          bookingId: id,
          metadata: JSON.stringify({ lat, lng, sitterId: ctx.sitterId }),
        },
      });
    }

    const updated = await prisma.booking.findUnique({
      where: { id },
      include: { sitter: true, pets: true },
    });
    if (updated) {
      await ensureEventQueueBridge();
      await emitVisitCompleted(updated, {});
    }

    return NextResponse.json({ ok: true, status: 'completed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Check-out failed', message },
      { status: 500 }
    );
  }
}
