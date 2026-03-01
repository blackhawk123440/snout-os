/**
 * Event-to-Queue Bridge
 * Subscribes to domain events and enqueues automation jobs.
 * booking.created → ownerNewBookingAlert (already done in form route)
 * booking.status.changed → confirmed → bookingConfirmation
 * visit.completed → postVisitThankYou + payout ledger (when payouts exist)
 * 
 * Must be initialized from Node.js runtime only (not Edge). Call from API routes
 * that emit events, e.g. form route, check-out route.
 */

import { eventEmitter } from "./event-emitter";
import { enqueueAutomation } from "./automation-queue";

let initialized = false;

export function initializeEventQueueBridge(): void {
  if (initialized) return;
  initialized = true;
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
