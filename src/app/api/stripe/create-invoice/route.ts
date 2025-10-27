import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createInvoice } from "@/lib/stripe";
import { formatPetsByQuantity } from "@/lib/booking-utils";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing booking ID" },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Create description with pet quantities
    const petQuantities = formatPetsByQuantity(booking.pets);
    const description = `${booking.service} - ${petQuantities}`;

    // Create Stripe invoice
    const invoiceUrl = await createInvoice(
      booking.email || "",
      booking.totalPrice,
      description
    );

    if (!invoiceUrl) {
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceUrl,
    });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}