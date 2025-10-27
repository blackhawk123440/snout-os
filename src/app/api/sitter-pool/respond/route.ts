import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { sitterId, bookingId, response } = await request.json();

    if (!sitterId || !bookingId || !response) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the sitter pool offer
    const offer = await prisma.sitterPoolOffer.findFirst({
      where: {
        bookingId,
        sitterIds: { has: sitterId },
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: {
        booking: {
          include: {
            pets: true,
          },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found or expired" }, { status: 404 });
    }

    if (response.toLowerCase() === "yes" || response.toLowerCase() === "accept") {
      // First to accept gets the booking
      const updatedOffer = await prisma.sitterPoolOffer.update({
        where: { id: offer.id },
        data: { 
          status: "accepted",
          acceptedBy: sitterId,
        },
      });

      // Assign sitter to booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { sitterId },
      });

      // Notify owner
      const ownerPhone = process.env.OWNER_ALERT_NUMBER || "+12567295129";
      const ownerMessage = `✅ SITTER ACCEPTED!

${offer.booking.firstName} ${offer.booking.lastName} - ${offer.booking.service}
Date: ${new Date(offer.booking.startAt).toLocaleDateString()}
Time: ${new Date(offer.booking.startAt).toLocaleTimeString()}

Sitter has been assigned and will receive booking details.`;

      try {
        await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: ownerPhone,
            message: ownerMessage,
          }),
        });

        // Log the message
        await prisma.message.create({
          data: {
            direction: "OutboundToOwner",
            from: process.env.OPENPHONE_NUMBER || "+12562589183",
            to: ownerPhone,
            body: ownerMessage,
            bookingId,
            status: "sent",
          },
        });
      } catch (error) {
        console.error("Failed to notify owner:", error);
      }

      // Notify other sitters that booking was taken
      const otherSitters = await prisma.sitter.findMany({
        where: { 
          id: { 
            in: offer.sitterIds.filter(id => id !== sitterId) 
          } 
        },
      });

      const declineMessage = `❌ BOOKING TAKEN

The booking for ${offer.booking.firstName} ${offer.booking.lastName} has been accepted by another sitter.

Thank you for your interest!`;

      const declinePromises = otherSitters.map(async (sitter) => {
        try {
          await fetch("/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: sitter.phone,
              message: declineMessage,
            }),
          });

          // Log the message
          await prisma.message.create({
            data: {
              direction: "OutboundToSitter",
              from: process.env.OPENPHONE_NUMBER || "+12562589183",
              to: sitter.phone,
              body: declineMessage,
              bookingId,
              status: "sent",
            },
          });
        } catch (error) {
          console.error(`Failed to notify ${sitter.firstName}:`, error);
        }
      });

      await Promise.all(declinePromises);

      return NextResponse.json({ 
        success: true, 
        message: "Booking accepted! You will receive confirmation details." 
      });

    } else if (response.toLowerCase() === "no" || response.toLowerCase() === "decline") {
      // Log the decline
      await prisma.message.create({
        data: {
          direction: "InboundFromSitter",
          from: sitterId,
          to: process.env.OPENPHONE_NUMBER || "+12562589183",
          body: `Declined: ${response}`,
          bookingId,
          status: "received",
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Booking declined. Thank you for your response." 
      });
    } else {
      return NextResponse.json({ 
        error: "Invalid response. Please reply YES or NO." 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Failed to process sitter response:", error);
    return NextResponse.json({ error: "Failed to process response" }, { status: 500 });
  }
}
