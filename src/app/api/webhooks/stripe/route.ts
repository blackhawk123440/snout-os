import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/openphone";
import { emitPaymentSuccess, emitPaymentFailed } from "@/lib/event-emitter";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/event-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Phase 7.1: Webhook validation gated behind feature flag
    // Per Master Spec Section 4.3.3: "Webhook validation must be enabled in production"
    // Epic 12.2.4: "Validate webhooks and lock down secrets"
    const enableWebhookValidation = env.ENABLE_WEBHOOK_VALIDATION === true;

    if (!signature) {
      const errorMessage = "Missing Stripe webhook signature";
      if (enableWebhookValidation) {
        await logEvent("webhook.validation.failed", "failed", {
          error: errorMessage,
          metadata: { webhookType: "stripe", path: "/api/webhooks/stripe" },
        });
        return NextResponse.json({ error: "No signature" }, { status: 401 });
      }
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      const errorMessage = "STRIPE_WEBHOOK_SECRET not configured";
      if (enableWebhookValidation) {
        await logEvent("webhook.validation.failed", "failed", {
          error: errorMessage,
          metadata: { webhookType: "stripe", path: "/api/webhooks/stripe" },
        });
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
      }
      return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      console.error("Webhook signature verification failed:", err);
      if (enableWebhookValidation) {
        // Log validation failure to EventLog
        await logEvent("webhook.validation.failed", "failed", {
          error: errorMessage,
          metadata: { webhookType: "stripe", path: "/api/webhooks/stripe" },
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle successful payment
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const bookingId = paymentIntent.metadata?.bookingId;
      
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            pets: true,
            timeSlots: true,
          },
        });

        if (booking) {
          // Update payment status and booking status
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "paid",
              // Phase 6.1: Set status to confirmed if still pending
              ...(booking.status === "pending" && { status: "confirmed" }),
            },
          });

          const amount = paymentIntent.amount / 100; // Convert from cents
          await emitPaymentSuccess(booking, amount);

          // Phase 6.1: Trigger booking confirmation automation on payment success
          // Per Master Spec: "Implement booking confirmed message on Stripe payment success"
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

    // Handle invoice payment
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const bookingId = invoice.metadata?.bookingId;
      
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            pets: true,
            timeSlots: true,
          },
        });

        if (booking) {
          // Update payment status and booking status
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "paid",
              // Phase 6.1: Set status to confirmed if still pending
              ...(booking.status === "pending" && { status: "confirmed" }),
            },
          });

          const amount = invoice.amount_paid / 100; // Convert from cents
          await emitPaymentSuccess(booking, amount);

          // Phase 6.1: Trigger booking confirmation automation on payment success
          // Per Master Spec: "Implement booking confirmed message on Stripe payment success"
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

    // Handle failed payment
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as any;
      const bookingId = paymentIntent.metadata?.bookingId;
      
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (booking) {
          await emitPaymentFailed(booking, paymentIntent.last_payment_error?.message || "Payment failed");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}