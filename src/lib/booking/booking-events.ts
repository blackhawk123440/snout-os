/**
 * Canonical booking lifecycle events.
 * Unified emit + enqueue helper for deterministic automation cascade.
 *
 * Event contract: { orgId, actorUserId?, bookingId, visitId?, clientId?, sitterId?, occurredAt, metadata }
 */

import { eventEmitter } from '@/lib/event-emitter';
import { logEvent } from '@/lib/log-event';
import { enqueueAutomation } from '@/lib/automation-queue';

export type BookingEventName =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'visit.started'
  | 'visit.completed'
  | 'delight.sent';

export interface BookingEventPayload {
  orgId: string;
  actorUserId?: string;
  bookingId: string;
  visitId?: string;
  clientId?: string;
  sitterId?: string;
  occurredAt: string; // ISO string
  metadata?: Record<string, unknown>;
}

const IDEMPOTENCY_VERSION = 'v1';

/**
 * Emit a booking event (logs to EventLog, emits to event emitter).
 * Fire-and-forget; never throws.
 */
export async function emitBookingEvent(
  eventName: BookingEventName,
  payload: BookingEventPayload
): Promise<void> {
  try {
    await logEvent({
      orgId: payload.orgId,
      actorUserId: payload.actorUserId,
      action: eventName,
      entityType: 'booking',
      entityId: payload.bookingId,
      bookingId: payload.bookingId,
      metadata: {
        visitId: payload.visitId,
        clientId: payload.clientId,
        sitterId: payload.sitterId,
        occurredAt: payload.occurredAt,
        ...payload.metadata,
      },
    });
  } catch (err) {
    console.error('[emitBookingEvent] logEvent failed:', err);
  }
}

/**
 * Enqueue automations for a booking event.
 * Idempotent: uses deterministic jobId to prevent double-enqueue.
 */
export async function enqueueAutomationsForBookingEvent(
  eventName: BookingEventName,
  payload: BookingEventPayload
): Promise<void> {
  const { orgId, bookingId, clientId, sitterId } = payload;
  const baseKey = `${eventName}:${bookingId}:${IDEMPOTENCY_VERSION}`;

  try {
    if (eventName === 'booking.created') {
      const meta = (payload.metadata || {}) as Record<string, unknown>;
      await enqueueAutomation(
        'ownerNewBookingAlert',
        'client',
        {
          orgId,
          bookingId,
          firstName: meta.firstName,
          lastName: meta.lastName,
          phone: meta.phone,
          service: meta.service,
        },
        `${baseKey}:ownerNewBookingAlert:client`
      );
      await enqueueAutomation(
        'ownerNewBookingAlert',
        'owner',
        {
          orgId,
          bookingId,
          firstName: meta.firstName,
          lastName: meta.lastName,
          phone: meta.phone,
          service: meta.service,
        },
        `${baseKey}:ownerNewBookingAlert:owner`
      );
    } else if (eventName === 'booking.confirmed') {
      await enqueueAutomation(
        'bookingConfirmation',
        'client',
        { bookingId },
        `${baseKey}:bookingConfirmation:client`
      );
      await enqueueAutomation(
        'bookingConfirmation',
        'owner',
        { bookingId },
        `${baseKey}:bookingConfirmation:owner`
      );
    } else if (eventName === 'visit.completed') {
      await enqueueAutomation(
        'postVisitThankYou',
        'client',
        { bookingId },
        `${baseKey}:postVisitThankYou:client`
      );
      if (sitterId) {
        await enqueueAutomation(
          'postVisitThankYou',
          'sitter',
          { bookingId, sitterId },
          `${baseKey}:postVisitThankYou:sitter`
        );
      }
    }
  } catch (err) {
    console.error('[enqueueAutomationsForBookingEvent] enqueue failed:', err);
  }
}

/**
 * Emit + enqueue in one call. Use from booking create/update/cancel paths.
 */
export async function emitAndEnqueueBookingEvent(
  eventName: BookingEventName,
  payload: BookingEventPayload
): Promise<void> {
  await emitBookingEvent(eventName, payload);
  await enqueueAutomationsForBookingEvent(eventName, payload);
}
