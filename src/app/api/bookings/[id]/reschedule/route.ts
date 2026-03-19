/**
 * POST /api/bookings/[id]/reschedule
 * Reschedules a booking to a new time and/or sitter.
 * Used by calendar drag-drop. Triggers notifications to affected parties.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { logEvent } from '@/lib/log-event';
import { enqueueAutomation } from '@/lib/automation-queue';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await context.params;

  try {
    const body = await request.json();
    const { startAt, endAt, sitterId } = body;

    if (!startAt && !endAt && !sitterId) {
      return NextResponse.json({ error: 'At least one of startAt, endAt, or sitterId is required' }, { status: 400 });
    }

    const db = getScopedDb(ctx);

    // Get current booking
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        orgId: true,
        status: true,
        startAt: true,
        endAt: true,
        sitterId: true,
        firstName: true,
        lastName: true,
        service: true,
        phone: true,
      },
    });

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot reschedule a ${booking.status} booking` }, { status: 422 });
    }

    // Check for conflicts at the new time/sitter
    const targetSitterId = sitterId || booking.sitterId;
    const targetStart = startAt ? new Date(startAt) : booking.startAt;
    const targetEnd = endAt ? new Date(endAt) : booking.endAt;

    if (targetSitterId) {
      const conflict = await db.booking.findFirst({
        where: {
          orgId: ctx.orgId,
          sitterId: targetSitterId,
          id: { not: bookingId },
          status: { in: ['pending', 'confirmed', 'in_progress'] },
          startAt: { lt: targetEnd },
          endAt: { gt: targetStart },
        },
        select: { id: true, firstName: true, lastName: true, service: true, startAt: true },
      });

      if (conflict) {
        return NextResponse.json({
          error: 'Conflict detected',
          conflict: {
            bookingId: conflict.id,
            clientName: `${conflict.firstName} ${conflict.lastName}`,
            service: conflict.service,
            startAt: conflict.startAt,
          },
        }, { status: 409 });
      }
    }

    // Build update data
    const updateData: Record<string, any> = {};
    const changes: string[] = [];

    if (startAt) {
      updateData.startAt = new Date(startAt);
      changes.push(`time: ${new Date(startAt).toLocaleString()}`);
    }
    if (endAt) {
      updateData.endAt = new Date(endAt);
    }
    if (sitterId && sitterId !== booking.sitterId) {
      updateData.sitterId = sitterId;
      const newSitter = await db.sitter.findUnique({
        where: { id: sitterId },
        select: { firstName: true, lastName: true },
      });
      changes.push(`sitter: ${newSitter?.firstName} ${newSitter?.lastName}`);
    }

    // Update booking
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: updateData,
      select: {
        id: true,
        startAt: true,
        endAt: true,
        sitterId: true,
        status: true,
        service: true,
        firstName: true,
        lastName: true,
      },
    });

    // Log the reschedule
    await logEvent({
      orgId: ctx.orgId,
      actorUserId: ctx.userId || undefined,
      action: 'booking.rescheduled',
      entityType: 'booking',
      entityId: bookingId,
      bookingId,
      status: 'success',
      metadata: {
        changes,
        previousStartAt: booking.startAt,
        previousSitterId: booking.sitterId,
        newStartAt: updated.startAt,
        newSitterId: updated.sitterId,
      },
    }).catch(() => {});

    // Trigger notifications
    try {
      // Notify client about reschedule
      if (booking.phone) {
        const { sendMessage } = await import('@/lib/message-utils');
        const dateStr = new Date(updated.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = new Date(updated.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        void sendMessage(
          booking.phone,
          `Hi ${booking.firstName}, your ${booking.service} has been rescheduled to ${dateStr} at ${timeStr}.`,
          bookingId,
        );
      }

      // Notify new sitter if changed
      if (sitterId && sitterId !== booking.sitterId) {
        await enqueueAutomation(
          'sitterAssignment',
          'sitter',
          { orgId: ctx.orgId, bookingId, sitterId },
          `sitterAssignment:sitter:${bookingId}:${sitterId}:reschedule`,
        ).catch(() => {});
      }
    } catch (notifyErr) {
      console.error('[Reschedule] Notification failed:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      booking: updated,
      changes,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
