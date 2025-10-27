import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { bookingId, sitterIds } = await request.json();

    if (!bookingId || !sitterIds || sitterIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // Get sitter details
    const sitters = await prisma.sitter.findMany({
      where: { id: { in: sitterIds } },
    });

    if (sitters.length === 0) {
      return NextResponse.json({ error: "No valid sitters found" }, { status: 400 });
    }

    // Create sitter pool offer
    const offer = await prisma.sitterPoolOffer.create({
      data: {
        bookingId,
        sitterIds,
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send SMS to each sitter
    const smsPromises = sitters.map(async (sitter) => {
      const message = `🐾 NEW BOOKING OPPORTUNITY

Client: ${booking.firstName} ${booking.lastName}
Service: ${booking.service}
Date: ${new Date(booking.startAt).toLocaleDateString()}
Time: ${new Date(booking.startAt).toLocaleTimeString()} - ${new Date(booking.endAt).toLocaleTimeString()}
Pets: ${booking.pets.map(p => p.name).join(", ")}

Reply YES to accept this booking, or NO to decline.

Offer expires in 24 hours.`;

      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: sitter.phone,
            message,
          }),
        });

        if (response.ok) {
          // Log the message
          await prisma.message.create({
            data: {
              direction: "OutboundToSitter",
              from: process.env.OPENPHONE_NUMBER || "+12562589183",
              to: sitter.phone,
              body: message,
              bookingId,
              status: "sent",
            },
          });
        }
      } catch (error) {
        console.error(`Failed to send SMS to ${sitter.firstName}:`, error);
      }
    });

    await Promise.all(smsPromises);

    return NextResponse.json({ 
      success: true, 
      offerId: offer.id,
      message: `Offered to ${sitters.length} sitter(s)` 
    });

  } catch (error) {
    console.error("Failed to create sitter pool offer:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}
