import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/openphone";
import { emitPaymentSuccess, emitPaymentFailed } from "@/lib/event-emitter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle successful payment
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const bookingId = paymentIntent.metadata?.bookingId;
      
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "paid",
            },
          });

          const amount = paymentIntent.amount / 100; // Convert from cents
          await emitPaymentSuccess(booking, amount);
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
        });

        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: "paid",
            },
          });

          const amount = invoice.amount_paid / 100; // Convert from cents
          await emitPaymentSuccess(booking, amount);
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