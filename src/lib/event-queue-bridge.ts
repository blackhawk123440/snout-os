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
import { logEventFromLogger } from "./event-logger";

let initialized = false;

function enqueueCalendarForBooking(booking: any, action: 'assignment' | 'schedule_change' | 'intake' = 'assignment'): void {
  const orgId = booking?.orgId || 'default';
  const bookingId = booking?.id;
  const sitterId = booking?.sitterId;
  if (!bookingId) return;
  if (sitterId) {
    enqueueCalendarSync({ type: 'upsert', bookingId, orgId, action }).catch((e) =>
      console.error('[EventQueueBridge] calendar upsert enqueue failed:', e)
    );
  }
}

export function initializeEventQueueBridge(): void {
  if (initialized) return;
  initialized = true;

  eventEmitter.on("booking.created", async (context: any) => {
    enqueueCalendarForBooking(context.booking, 'intake');
  });

  eventEmitter.on("booking.updated", async (context: any) => {
    const booking = context.booking;
    if (booking?.status === 'cancelled' && booking?.sitterId) {
      enqueueCalendarSync({
        type: 'delete',
        bookingId: booking.id,
        sitterId: booking.sitterId,
        orgId: booking.orgId || 'default',
        action: 'cancellation',
      }).catch((e) => console.error('[EventQueueBridge] calendar delete enqueue failed:', e));
    } else {
      enqueueCalendarForBooking(booking, 'schedule_change');
    }
  });

  eventEmitter.on("booking.assigned", async (context: any) => {
    enqueueCalendarForBooking(context.booking, 'assignment');
  });

  eventEmitter.on("sitter.assigned", async (context: any) => {
    enqueueCalendarForBooking(context.booking, 'assignment');
  });

  eventEmitter.on("booking.status.changed", async (context: any) => {
    if (context.newStatus !== "confirmed") return;
    const bookingId = context.bookingId;
    const orgId = context.booking?.orgId || "default";
    if (!bookingId) return;
    try {
      await enqueueAutomation(
        "bookingConfirmation",
        "client",
        { orgId, bookingId },
        `bookingConfirmation:client:${bookingId}`
      );
      await enqueueAutomation(
        "bookingConfirmation",
        "owner",
        { orgId, bookingId },
        `bookingConfirmation:owner:${bookingId}`
      );
    } catch (err) {
      console.error("[EventQueueBridge] Failed to enqueue bookingConfirmation:", err);
    }
  });

  eventEmitter.on("visit.completed", async (context: any) => {
    const bookingId = context.bookingId;
    const orgId = context.booking?.orgId || "default";
    if (!bookingId) return;
    try {
      await enqueueAutomation(
        "postVisitThankYou",
        "client",
        { bookingId, orgId },
        `postVisitThankYou:client:${bookingId}`
      );
      await logEventFromLogger("review.scheduled", "success", {
        orgId,
        bookingId,
        metadata: { recipient: "client" },
      });
      if (context.booking?.sitterId) {
        await enqueueAutomation(
          "postVisitThankYou",
          "sitter",
          { bookingId, sitterId: context.booking.sitterId, orgId },
          `postVisitThankYou:sitter:${bookingId}`
        );
        await logEventFromLogger("review.scheduled", "success", {
          orgId,
          bookingId,
          metadata: { recipient: "sitter" },
        });
        const { enqueuePayoutForBooking } = await import("@/lib/payout/payout-queue");
        enqueuePayoutForBooking({
          orgId,
          bookingId,
          sitterId: context.booking.sitterId,
        }).catch((e) => console.error("[EventQueueBridge] Failed to enqueue payout:", e));
      }
    } catch (err) {
      console.error("[EventQueueBridge] Failed to enqueue postVisitThankYou:", err);
      await logEventFromLogger("review.scheduled", "failed", {
        orgId,
        bookingId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
