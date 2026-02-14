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
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            pets: true,
            timeSlots: true,
            client: true,
          },
        });

        if (booking) {
          const previousStatus = booking.status;
          
          // Update payment status and booking status
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "paid",
              // Set status to confirmed if still pending
              ...(booking.status === "pending" && { status: "confirmed" }),
            },
          });

          // Reload booking to get updated status
          const updatedBooking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
              pets: true,
              timeSlots: true,
              client: true,
            },
          });

          if (!updatedBooking) {
            return NextResponse.json({ error: 'Booking not found after update' }, { status: 404 });
          }

          const amount = paymentIntent.amount / 100; // Convert from cents
          await emitPaymentSuccess(updatedBooking, amount);

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

              // Emit audit event
              await prisma.eventLog.create({
                data: {
                  eventType: 'booking.confirmed.processed',
                  status: 'success',
                  bookingId,
                  metadata: JSON.stringify({
                    correlationId: bookingId,
                    source: 'stripe_webhook',
                    eventType: event.type,
                  }),
                },
              });

              console.log(`[Stripe Webhook] Phase 3: Thread and masking number created for booking ${bookingId}`);
            } catch (error: any) {
              // Non-blocking: Log error but don't fail webhook
              console.error(`[Stripe Webhook] Phase 3: Failed to create thread for booking ${bookingId}:`, error);
              
              // Emit audit event for failure
              await prisma.eventLog.create({
                data: {
                  eventType: 'booking.confirmed.processed',
                  status: 'failed',
                  bookingId,
                  error: error.message,
                  metadata: JSON.stringify({
                    correlationId: bookingId,
                    source: 'stripe_webhook',
                    error: error.message,
                  }),
                },
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
