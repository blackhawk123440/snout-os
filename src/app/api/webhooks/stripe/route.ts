import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";
import { sendSMS } from "@/lib/openphone";

const prisma = new PrismaClient();

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
      const paymentIntent = event.data.object;
      
      // Update booking status to paid
      // You'll need to match the payment intent to a booking
      // This is a simplified example
      console.log("Payment succeeded:", paymentIntent.id);
      
      // Send confirmation SMS to client
      // You'll need to get the booking details from the payment intent metadata
    }

    // Handle invoice payment
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      
      // Update booking status to paid
      // You'll need to match the invoice to a booking
      console.log("Invoice payment succeeded:", invoice.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}