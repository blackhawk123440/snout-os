import { NextResponse } from 'next/server';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { emitVisitCompleted } from '@/lib/event-emitter';
import { ensureEventQueueBridge } from '@/lib/event-queue-bridge-init';
import { publish, channels } from '@/lib/realtime/bus';
import { calculatePayoutForBooking, executePayout } from '@/lib/payout/payout-engine';
import { persistPayrollRunFromTransfer } from '@/lib/payroll/payroll-service';
import { syncConversationLifecycleWithBookingWorkflow } from '@/lib/messaging/conversation-service';
import { emitClientLifecycleNoticeIfNeeded } from '@/lib/messaging/lifecycle-client-copy';

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
    ctx = await getRequestContext(request);
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

    if (booking.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot check out: booking is ${booking.status}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;

    await db.booking.update({
      where: { id },
      data: { status: 'completed' },
    });
    const lifecycleSync = await syncConversationLifecycleWithBookingWorkflow({
      orgId: ctx.orgId,
      bookingId: booking.id,
      clientId: booking.clientId,
      phone: booking.phone,
      firstName: booking.firstName,
      lastName: booking.lastName,
      sitterId: booking.sitterId,
      bookingStatus: 'completed',
      serviceWindowStart: booking.startAt,
      serviceWindowEnd: booking.endAt,
    }).catch((error) => {
      console.error('[check-out] lifecycle sync failed:', error);
      return null;
    });
    if (lifecycleSync?.threadId) {
      void emitClientLifecycleNoticeIfNeeded({
        orgId: ctx.orgId,
        threadId: lifecycleSync.threadId,
        notice: 'post_service_grace',
        dedupeKey: `${booking.id}:checkout`,
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
          checkOutAt: new Date(),
          status: 'completed',
        },
      });
    }

    if (lat != null && lng != null) {
      await db.eventLog.create({
        data: {
          orgId: ctx.orgId,
          eventType: 'sitter.check_out',
          status: 'success',
          bookingId: id,
          metadata: JSON.stringify({ lat, lng, sitterId: ctx.sitterId, correlationId: ctx.correlationId }),
        },
      });
    }

    const updated = await db.booking.findUnique({
      where: { id },
      include: { sitter: true, pets: true },
    });
    if (updated) {
      await ensureEventQueueBridge();
      await emitVisitCompleted(updated, {}, ctx.correlationId);
      if (updated.sitterId) {
        publish(channels.sitterToday(updated.orgId ?? ctx.orgId, updated.sitterId), {
          type: 'visit.checkout',
          bookingId: id,
          ts: Date.now(),
        }).catch(() => {});
      }

      // Launch reliability: process payout synchronously as a fallback in web path.
      // Worker path remains active and idempotent; executePayout skips duplicates.
      // Skip payout for Meet & Greet (free service, no payout)
      const isMeetAndGreet = updated.service === 'Meet & Greet';
      if (updated.sitterId && !isMeetAndGreet) {
        const totalPrice = Number(updated.totalPrice) || 0;
        if (totalPrice > 0) {
          const commissionPct = updated.sitter?.commissionPercentage ?? 80;
          const calc = calculatePayoutForBooking(totalPrice, commissionPct);
          if (calc.amountCents > 0) {
            try {
              const payoutResult = await executePayout({
                db: db as any,
                orgId: ctx.orgId,
                sitterId: updated.sitterId,
                bookingId: updated.id,
                amountCents: calc.amountCents,
                currency: 'usd',
                correlationId: ctx.correlationId,
              });
              if (payoutResult.success && payoutResult.payoutTransferId) {
                const commissionAmount = totalPrice - calc.netAmount;
                await persistPayrollRunFromTransfer(
                  db as any,
                  ctx.orgId,
                  payoutResult.payoutTransferId,
                  updated.sitterId,
                  totalPrice,
                  commissionAmount,
                  calc.netAmount
                ).catch((e) => console.error('[check-out] persistPayrollRunFromTransfer failed:', e));
              }
            } catch (payoutError) {
              console.error('[check-out] synchronous payout fallback failed:', payoutError);
            }
          }
        }
      }
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
