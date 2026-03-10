import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { enqueueCalendarSync } from '@/lib/calendar-queue';
import { ensureEventQueueBridge } from '@/lib/event-queue-bridge-init';
import { emitBookingUpdated } from '@/lib/event-emitter';

function truncateExternalEventId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function extractSyncError(eventLog: { error?: string | null; metadata?: string | null } | null): string | null {
  if (!eventLog) return null;
  if (eventLog.error) return eventLog.error;
  if (!eventLog.metadata) return null;
  try {
    const parsed = JSON.parse(eventLog.metadata) as Record<string, unknown>;
    const direct =
      (typeof parsed.error === 'string' && parsed.error) ||
      (typeof parsed.message === 'string' && parsed.message);
    if (direct) return direct;
    const metaError =
      typeof parsed.metadata === 'object' && parsed.metadata
        ? (parsed.metadata as Record<string, unknown>).error
        : null;
    return typeof metaError === 'string' ? metaError : null;
  } catch {
    return null;
  }
}

const ALLOWED_BOOKING_STATUSES = new Set([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);

const VALID_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['in_progress', 'cancelled']),
  in_progress: new Set(['completed', 'cancelled']),
  completed: new Set([]),
  cancelled: new Set([]),
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['owner', 'admin']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const db = getScopedDb(ctx);

  try {
    const booking = await db.booking.findFirst({
      where: { id },
      include: {
        sitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            calendarSyncEnabled: true,
            googleCalendarId: true,
          },
        },
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        pets: { select: { id: true, name: true, species: true, notes: true } },
        reports: { take: 1, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true } },
        calendarEvents: {
          select: {
            googleCalendarEventId: true,
            lastSyncedAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const [latestSucceededCharge, latestCalendarFailure] = await Promise.all([
      db.stripeCharge.findFirst({
        where: { bookingId: booking.id, status: 'succeeded' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          currency: true,
          paymentIntentId: true,
        },
      }),
      db.eventLog.findFirst({
        where: {
          bookingId: booking.id,
          status: 'failed',
          eventType: { in: ['calendar.sync.failed', 'calendar.dead', 'calendar.repair.failed'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, error: true, metadata: true },
      }),
    ]);

    const calendarMapping = booking.calendarEvents?.[0] ?? null;
    const syncError = extractSyncError(latestCalendarFailure);
    const hasCalendarSync = Boolean(calendarMapping?.googleCalendarEventId);
    const calendarStatus = !booking.sitter
      ? 'not_assigned'
      : !booking.sitter.calendarSyncEnabled
        ? 'disabled'
        : hasCalendarSync
          ? 'synced'
          : syncError
            ? 'failed'
            : 'pending';

    return NextResponse.json({
      booking: {
        id: booking.id,
        firstName: booking.firstName,
        lastName: booking.lastName,
        phone: booking.phone,
        email: booking.email,
        address: booking.address,
        service: booking.service,
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalPrice: Number(booking.totalPrice),
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        sitter: booking.sitter,
        client: booking.client,
        pets: booking.pets,
        hasReport: booking.reports.length > 0,
        paymentProof: latestSucceededCharge
          ? {
              status: 'paid',
              amount: Number(latestSucceededCharge.amount) / 100,
              paidAt: latestSucceededCharge.createdAt,
              bookingReference: booking.id,
              paymentReference: latestSucceededCharge.id,
              paymentIntentId: latestSucceededCharge.paymentIntentId ?? null,
              currency: latestSucceededCharge.currency || 'usd',
              receiptLink: null,
            }
          : null,
        calendarSyncProof: {
          status: calendarStatus,
          externalEventId: truncateExternalEventId(calendarMapping?.googleCalendarEventId),
          connectedCalendar: booking.sitter?.googleCalendarId || null,
          connectedAccount: booking.sitter
            ? `${booking.sitter.firstName} ${booking.sitter.lastName}`.trim()
            : null,
          lastSyncedAt: calendarMapping?.lastSyncedAt ?? null,
          syncError,
          openInGoogleCalendarUrl: calendarMapping?.googleCalendarEventId
            ? `https://calendar.google.com/calendar/u/0/r/search?q=${encodeURIComponent(
                calendarMapping.googleCalendarEventId
              )}`
            : null,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load booking', message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['owner', 'admin']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const db = getScopedDb(ctx);

  try {
    const body = (await request.json()) as { status?: string; sitterId?: string | null };
    const existing = await db.booking.findFirst({
      where: { id },
      select: { id: true, status: true, sitterId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    const requestedStatus = typeof body.status === 'string' ? body.status.trim() : '';
    if (requestedStatus) {
      if (!ALLOWED_BOOKING_STATUSES.has(requestedStatus)) {
        return NextResponse.json(
          {
            error: 'Invalid booking status',
            allowedStatuses: Array.from(ALLOWED_BOOKING_STATUSES),
          },
          { status: 400 }
        );
      }

      if (requestedStatus !== existing.status) {
        const validNextStatuses = VALID_STATUS_TRANSITIONS[existing.status] ?? new Set<string>();
        if (!validNextStatuses.has(requestedStatus)) {
          return NextResponse.json(
            {
              error: 'Invalid booking status transition',
              from: existing.status,
              to: requestedStatus,
              allowedTransitions: Array.from(validNextStatuses),
            },
            { status: 409 }
          );
        }
      }

      data.status = requestedStatus;
    }
    if (body.sitterId === null || typeof body.sitterId === 'string') data.sitterId = body.sitterId;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
    }

    const updated = await db.booking.update({
      where: { id: existing.id },
      data,
      select: { id: true, status: true, sitterId: true, updatedAt: true },
    });

    if (requestedStatus && requestedStatus !== existing.status) {
      await db.bookingStatusHistory.create({
        data: {
          orgId: ctx.orgId,
          bookingId: existing.id,
          fromStatus: existing.status,
          toStatus: requestedStatus,
          changedBy: ctx.userId ?? null,
          reason: 'owner_operator_update',
        },
      });
    }

    // Calendar consistency: enqueue sync/delete so booking and calendar stay in sync
    const newStatus = (updated.status as string) ?? existing.status;
    const newSitterId = updated.sitterId ?? existing.sitterId;
    const cancelled = newStatus === 'cancelled';
    const sitterChanged = body.sitterId !== undefined && existing.sitterId !== newSitterId;

    if (existing.sitterId && (cancelled || sitterChanged)) {
      enqueueCalendarSync({
        type: 'delete',
        bookingId: existing.id,
        sitterId: existing.sitterId,
        orgId: ctx.orgId,
      }).catch((e) => console.error('[Booking PATCH] calendar delete enqueue failed:', e));
    }
    if (newSitterId && !cancelled) {
      enqueueCalendarSync({ type: 'upsert', bookingId: existing.id, orgId: ctx.orgId }).catch((e) =>
        console.error('[Booking PATCH] calendar upsert enqueue failed:', e)
      );
    }

    try {
      await ensureEventQueueBridge();
      const full = await db.booking.findFirst({
        where: { id: existing.id },
        include: { pets: true, timeSlots: true, sitter: true, client: true },
      });
      if (full) await emitBookingUpdated(full, existing.status);
    } catch (err) {
      console.error('[Booking PATCH] Failed to emit booking.updated:', err);
    }

    return NextResponse.json({ booking: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update booking', message }, { status: 500 });
  }
}

