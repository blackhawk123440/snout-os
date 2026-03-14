import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { enqueueCalendarSync } from '@/lib/calendar-queue';
import { ensureEventQueueBridge } from '@/lib/event-queue-bridge-init';
import { emitBookingUpdated } from '@/lib/event-emitter';
import { syncConversationLifecycleWithBookingWorkflow } from '@/lib/messaging/conversation-service';
import { emitClientLifecycleNoticeIfNeeded } from '@/lib/messaging/lifecycle-client-copy';

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

    const [latestSucceededCharge, latestCalendarFailure, thread] = await Promise.all([
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
      db.messageThread.findFirst({
        where: { bookingId: booking.id },
        select: { id: true },
      }),
    ]);
    const [latestPaymentLinkMessage, latestTipLinkMessage] = await Promise.all([
      thread
        ? db.messageEvent.findFirst({
            where: {
              threadId: thread.id,
              direction: 'outbound',
              metadataJson: { contains: '"templateType":"payment_link"' },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              createdAt: true,
              deliveryStatus: true,
              providerMessageSid: true,
              failureDetail: true,
            },
          })
        : Promise.resolve(null),
      thread
        ? db.messageEvent.findFirst({
            where: {
              threadId: thread.id,
              direction: 'outbound',
              metadataJson: { contains: '"templateType":"tip_link"' },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              createdAt: true,
              deliveryStatus: true,
              providerMessageSid: true,
              failureDetail: true,
            },
          })
        : Promise.resolve(null),
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
        paymentMessageState: latestPaymentLinkMessage
          ? {
              status: latestPaymentLinkMessage.deliveryStatus,
              sentAt: latestPaymentLinkMessage.createdAt,
              providerMessageId: latestPaymentLinkMessage.providerMessageSid,
              error: latestPaymentLinkMessage.failureDetail,
            }
          : null,
        tipMessageState: latestTipLinkMessage
          ? {
              status: latestTipLinkMessage.deliveryStatus,
              sentAt: latestTipLinkMessage.createdAt,
              providerMessageId: latestTipLinkMessage.providerMessageSid,
              error: latestTipLinkMessage.failureDetail,
            }
          : null,
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
    const body = (await request.json()) as {
      status?: string;
      sitterId?: string | null;
      meetAndGreetScheduledAt?: string | null;
      meetAndGreetConfirmed?: boolean;
      clientApprovedSitter?: boolean;
      sitterApprovedClient?: boolean;
    };
    const existing = await db.booking.findFirst({
      where: { id },
      select: {
        id: true,
        orgId: true,
        clientId: true,
        status: true,
        sitterId: true,
        startAt: true,
        endAt: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
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

    const parseOptionalDate = (value: string | null | undefined): Date | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    };
    const meetAndGreetScheduledAt = parseOptionalDate(body.meetAndGreetScheduledAt);
    const meetAndGreetConfirmedAt =
      body.meetAndGreetConfirmed === true ? new Date() : body.meetAndGreetConfirmed === false ? null : undefined;
    const clientApprovedAt =
      body.clientApprovedSitter === true ? new Date() : body.clientApprovedSitter === false ? null : undefined;
    const sitterApprovedAt =
      body.sitterApprovedClient === true ? new Date() : body.sitterApprovedClient === false ? null : undefined;
    const hasWorkflowUpdate =
      meetAndGreetScheduledAt !== undefined ||
      meetAndGreetConfirmedAt !== undefined ||
      clientApprovedAt !== undefined ||
      sitterApprovedAt !== undefined;

    if (Object.keys(data).length === 0 && !hasWorkflowUpdate) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
    }

    const updated =
      Object.keys(data).length > 0
        ? await db.booking.update({
            where: { id: existing.id },
            data,
            select: { id: true, status: true, sitterId: true, updatedAt: true },
          })
        : {
            id: existing.id,
            status: existing.status,
            sitterId: existing.sitterId,
            updatedAt: new Date(),
          };

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

    const lifecycleSync = await syncConversationLifecycleWithBookingWorkflow({
      orgId: ctx.orgId,
      bookingId: existing.id,
      clientId: existing.clientId,
      phone: existing.phone,
      firstName: existing.firstName,
      lastName: existing.lastName,
      sitterId: updated.sitterId,
      bookingStatus: updated.status,
      serviceWindowStart: existing.startAt,
      serviceWindowEnd: existing.endAt,
      meetAndGreetScheduledAt,
      meetAndGreetConfirmedAt,
      clientApprovedAt,
      sitterApprovedAt,
    }).catch((error) => {
      console.error('[Booking PATCH] Failed to sync messaging lifecycle:', error);
      return null;
    });
    if (lifecycleSync?.threadId && meetAndGreetScheduledAt) {
      void emitClientLifecycleNoticeIfNeeded({
        orgId: ctx.orgId,
        threadId: lifecycleSync.threadId,
        notice: 'meet_greet_scheduled',
        dedupeKey: `${existing.id}:${updated.updatedAt.toISOString()}`,
      }).catch(() => {});
    }
    if (lifecycleSync?.threadId && meetAndGreetConfirmedAt) {
      void emitClientLifecycleNoticeIfNeeded({
        orgId: ctx.orgId,
        threadId: lifecycleSync.threadId,
        notice: 'meet_greet_confirmed',
        dedupeKey: `${existing.id}:${updated.updatedAt.toISOString()}`,
      }).catch(() => {});
    }
    if (lifecycleSync?.threadId && clientApprovedAt && sitterApprovedAt) {
      void emitClientLifecycleNoticeIfNeeded({
        orgId: ctx.orgId,
        threadId: lifecycleSync.threadId,
        notice: 'service_activated',
        dedupeKey: `${existing.id}:${updated.updatedAt.toISOString()}`,
      }).catch(() => {});
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

