/**
 * Event-to-Queue Bridge
 * Subscribes to domain events and enqueues automation jobs.
 * booking.created → ownerNewBookingAlert (already done in form route)
 * booking.status.changed → confirmed → bookingConfirmation
 * visit.completed → postVisitThankYou + payout ledger (when payouts exist)
 * booking.created/updated/cancelled → calendar.sync (one-way Snout → Google)
 *
 * Must be initialized from Node.js runtime only (not Edge). Call from API routes
 * that emit events, e.g. form route, check-out route.
 */

import { eventEmitter } from "./event-emitter";
import { enqueueAutomation } from "./automation-queue";
import { enqueueCalendarSync } from "./calendar-queue";

let initialized = false;

function enqueueCalendarForBooking(booking: any): void {
  const orgId = booking?.orgId || 'default';
  const bookingId = booking?.id;
  const sitterId = booking?.sitterId;
  if (!bookingId) return;
  if (sitterId) {
    enqueueCalendarSync({ type: 'upsert', bookingId, orgId }).catch((e) =>
      console.error('[EventQueueBridge] calendar upsert enqueue failed:', e)
    );
  }
}

export function initializeEventQueueBridge(): void {
  if (initialized) return;
  initialized = true;

  eventEmitter.on("booking.created", async (context: any) => {
    enqueueCalendarForBooking(context.booking);
  });

  eventEmitter.on("booking.updated", async (context: any) => {
    const booking = context.booking;
    if (booking?.status === 'cancelled' && booking?.sitterId) {
      enqueueCalendarSync({
        type: 'delete',
        bookingId: booking.id,
        sitterId: booking.sitterId,
        orgId: booking.orgId || 'default',
      }).catch((e) => console.error('[EventQueueBridge] calendar delete enqueue failed:', e));
    } else {
      enqueueCalendarForBooking(booking);
    }
  });

  eventEmitter.on("booking.assigned", async (context: any) => {
    enqueueCalendarForBooking(context.booking);
  });

  eventEmitter.on("sitter.assigned", async (context: any) => {
    enqueueCalendarForBooking(context.booking);
  });

  eventEmitter.on("booking.status.changed", async (context: any) => {
    if (context.newStatus !== "confirmed") return;
    const bookingId = context.bookingId;
    if (!bookingId) return;
    try {
      await enqueueAutomation(
        "bookingConfirmation",
        "client",
        { bookingId },
        `bookingConfirmation:client:${bookingId}`
      );
      await enqueueAutomation(
        "bookingConfirmation",
        "owner",
        { bookingId },
        `bookingConfirmation:owner:${bookingId}`
      );
    } catch (err) {
      console.error("[EventQueueBridge] Failed to enqueue bookingConfirmation:", err);
    }
  });

  eventEmitter.on("visit.completed", async (context: any) => {
    const bookingId = context.bookingId;
    if (!bookingId) return;
    try {
      await enqueueAutomation(
        "postVisitThankYou",
        "client",
        { bookingId },
        `postVisitThankYou:client:${bookingId}`
      );
      await enqueueAutomation(
        "postVisitThankYou",
        "sitter",
        { bookingId, sitterId: context.booking?.sitterId },
        `postVisitThankYou:sitter:${bookingId}`
      );
      // Payout ledger entry: when Stripe Connect + payout tables exist, enqueue here
      // For now, no-op
    } catch (err) {
      console.error("[EventQueueBridge] Failed to enqueue postVisitThankYou:", err);
    }
  });
}
