import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculatePriceBreakdown } from "@/lib/booking-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get booking details - include timeSlots for accurate price calculation
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Calculate the true total using price breakdown
    const breakdown = calculatePriceBreakdown(booking);
    const serviceAmount = breakdown.total;
    
    // Generate sitter alias for the tip link
    const sitterAlias = booking.sitter 
      ? `${booking.sitter.firstName}-${booking.sitter.lastName}`.toLowerCase().replace(/\s+/g, '-')
      : 'snout-services';

    // Create tip link URL using internal route: /tip/t/{amount}/{sitter-alias}
    const tipLinkUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tip/t/${serviceAmount}/${sitterAlias}`;

    // Calculate tip amounts for display
    const tipCalculations = {
      serviceAmount,
      tip10: Math.round(serviceAmount * 0.10 * 100) / 100,
      tip15: Math.round(serviceAmount * 0.15 * 100) / 100,
      tip20: Math.round(serviceAmount * 0.20 * 100) / 100,
      tip25: Math.round(serviceAmount * 0.25 * 100) / 100,
      total10: Math.round(serviceAmount * 1.10 * 100) / 100,
      total15: Math.round(serviceAmount * 1.15 * 100) / 100,
      total20: Math.round(serviceAmount * 1.20 * 100) / 100,
      total25: Math.round(serviceAmount * 1.25 * 100) / 100,
    };

    // Update booking with tip link
    await prisma.booking.update({
      where: { id: bookingId },
      data: { tipLinkUrl },
    });

    return NextResponse.json({
      tipLink: tipLinkUrl,
      bookingId: booking.id,
      serviceAmount,
      sitterAlias,
      tipCalculations,
      customerEmail: booking.email,
      customerName: `${booking.firstName} ${booking.lastName}`,
      sitterName: booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned',
    });

  } catch (error) {
    console.error("Failed to create tip link:", error);
    return NextResponse.json(
      { error: "Failed to create tip link" },
      { status: 500 }
    );
  }
}
