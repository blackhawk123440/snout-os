import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, sitterIds, message } = body;

    if (!bookingId || !sitterIds || !Array.isArray(sitterIds)) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Create sitter pool offer
    const offer = await prisma.sitterPoolOffer.create({
      data: {
        bookingId,
        sitterIds,
        message: message || `New ${booking.service} opportunity available!`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: "active",
      },
    });

    return NextResponse.json({ offer });
  } catch (error) {
    console.error("Failed to create sitter pool offer:", error);
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    );
  }
}