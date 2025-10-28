import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Calculate the service amount (base total)
    const serviceAmount = booking.totalPrice || 0;
    
    // Generate sitter alias for the tip link
    const sitterAlias = booking.sitter 
      ? `${booking.sitter.firstName}-${booking.sitter.lastName}`.toLowerCase().replace(/\s+/g, '-')
      : 'sitter';

    // Create tip link URL similar to tip.snoutservices.com
    const tipLinkUrl = `https://tip.snoutservices.com/link.html?amount=${serviceAmount}&sitter=${sitterAlias}`;

    // Calculate tip amounts for display
    const tipCalculations = {
      serviceAmount: serviceAmount,
      tip10: Math.round(serviceAmount * 0.10 * 100) / 100,
      tip15: Math.round(serviceAmount * 0.15 * 100) / 100,
      tip20: Math.round(serviceAmount * 0.20 * 100) / 100,
      tip25: Math.round(serviceAmount * 0.25 * 100) / 100,
      total10: Math.round((serviceAmount + serviceAmount * 0.10) * 100) / 100,
      total15: Math.round((serviceAmount + serviceAmount * 0.15) * 100) / 100,
      total20: Math.round((serviceAmount + serviceAmount * 0.20) * 100) / 100,
      total25: Math.round((serviceAmount + serviceAmount * 0.25) * 100) / 100,
    };

    // Update booking with tip link
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        tipLinkUrl: tipLinkUrl,
      },
    });

    return NextResponse.json({
      tipLink: tipLinkUrl,
      bookingId: booking.id,
      serviceAmount: serviceAmount,
      sitterAlias: sitterAlias,
      tipCalculations: tipCalculations,
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
