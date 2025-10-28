import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendSMS } from "@/lib/openphone";

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

    // Get sitter details for SMS
    const sitters = await prisma.sitter.findMany({
      where: { id: { in: sitterIds } },
    });

    // Create sitter pool offer
    const offer = await prisma.sitterPoolOffer.create({
      data: {
        bookingId,
        sitterIds: JSON.stringify(sitterIds),
        message: message || `New ${booking.service} opportunity available!`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: "active",
        responses: JSON.stringify([]),
      },
    });

    // Send SMS to all selected sitters
    const smsPromises = sitters.map(async (sitter) => {
      try {
        const smsMessage = `${message}\n\nReply YES to accept this booking opportunity!`;
        await sendSMS(sitter.phone, smsMessage);
        
        // Log the message in the database
        await prisma.message.create({
          data: {
            direction: "outbound",
            body: smsMessage,
            status: "sent",
            bookingId: bookingId,
            from: "system",
            to: sitter.phone,
          },
        });
      } catch (error) {
        console.error(`Failed to send SMS to sitter ${sitter.id}:`, error);
      }
    });

    // Wait for all SMS to be sent (don't fail the request if SMS fails)
    await Promise.allSettled(smsPromises);

    return NextResponse.json({ offer });
  } catch (error) {
    console.error("Failed to create sitter pool offer:", error);
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    );
  }
}