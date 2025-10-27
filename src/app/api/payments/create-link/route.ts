import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink } from "@/lib/stripe";
import { formatPetsByQuantity } from "@/lib/booking-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, amount, customerEmail } = body;

    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create description with pet quantities
    const petQuantities = formatPetsByQuantity(body.pets || []);
    const description = `Pet Care Service - ${petQuantities}`;

    // Create payment link
    const paymentLink = await createPaymentLink(
      amount,
      description,
      customerEmail
    );

    if (!paymentLink) {
      return NextResponse.json(
        { error: "Failed to create payment link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentLink,
    });
  } catch (error) {
    console.error("Failed to create payment link:", error);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}