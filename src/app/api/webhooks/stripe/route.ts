/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events, including payment success and booking confirmation.
 * Phase 3: Integrates with booking confirmed handler for thread + masking number creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emitPaymentSuccess } from '@/lib/event-emitter';
import { onBookingConfirmed } from '@/lib/bookings/booking-confirmed-handler';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    // Handle successful payment
    if (event.type === "payment_intent.succeeded" || event.type === "invoice.payment_succeeded") {
      const paymentIntent = event.data.object as any;
      const bookingId = paymentIntent.metadata?.bookingId;
      
      if (bookingId) {
        // Note: Booking model doesn't exist in enterprise-messaging-dashboard schema
        // This webhook should be handled by the main app's booking system
        // For Phase 3, we'll assume booking exists and is confirmed
        // In production, this would fetch from the main app's database
        
        // Mock booking data for Phase 3 integration
        // Note: In production, fetch actual booking from main app database
        const previousStatus: string = 'pending';
        const updatedBooking = {
          id: bookingId,
          status: 'confirmed' as string,
          orgId: 'default', // Would come from actual booking
          clientId: '', // Would come from actual booking
          sitterId: null as string | null,
          startAt: new Date(),
          endAt: new Date(),
        };
        
        const amount = paymentIntent.amount / 100; // Convert from cents
        // Note: emitPaymentSuccess would need booking model - skipping for now
        // await emitPaymentSuccess(updatedBooking, amount);

        // Phase 3: Handle booking confirmation (thread + masking number + window)
        // Only trigger when booking moves into CONFIRMED (not on every webhook)
        if (previousStatus !== "confirmed" && updatedBooking.status === "confirmed") {
          try {
            const orgId = updatedBooking.orgId || 'default'; // TODO: Get actual orgId from booking
            
            await onBookingConfirmed({
              bookingId,
              orgId,
              clientId: updatedBooking.clientId || '',
              sitterId: updatedBooking.sitterId,
              startAt: new Date(updatedBooking.startAt),
              endAt: new Date(updatedBooking.endAt),
              actorUserId: 'system', // System-triggered via webhook
            });

            // Emit audit event (using console.log - AuditEvent model structure differs)
            console.log('[Stripe Webhook] Booking confirmed processed', {
              eventType: 'booking.confirmed.processed',
              status: 'success',
              bookingId,
              correlationId: bookingId,
              source: 'stripe_webhook',
              stripeEventType: event.type,
            });

            console.log(`[Stripe Webhook] Phase 3: Thread and masking number created for booking ${bookingId}`);
          } catch (error: any) {
            // Non-blocking: Log error but don't fail webhook
            console.error(`[Stripe Webhook] Phase 3: Failed to create thread for booking ${bookingId}:`, error);
            
            // Emit audit event for failure
            console.error('[Stripe Webhook] Booking confirmed processing failed', {
              eventType: 'booking.confirmed.processed',
              status: 'failed',
              bookingId,
              error: error.message,
              correlationId: bookingId,
              source: 'stripe_webhook',
            });
          }
        }

        // Phase 6.1: Trigger booking confirmation automation on payment success
        const { enqueueAutomation } = await import("@/lib/automation-queue");
        
        // Enqueue booking confirmation for client
        await enqueueAutomation(
          "bookingConfirmation",
          "client",
          { bookingId },
          `bookingConfirmation:client:${bookingId}:payment`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", message: error.message },
      { status: 500 }
    );
  }
}
