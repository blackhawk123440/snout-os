import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendSMS } from "@/lib/openphone";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, sitterId, response } = body;

    if (!offerId || !sitterId || !response) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the offer
    const offer = await prisma.sitterPoolOffer.findUnique({
      where: { id: offerId },
      include: {
        booking: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check if offer is still active
    if (offer.status !== "active") {
      return NextResponse.json({ error: "Offer is no longer active" }, { status: 400 });
    }

    // Check if offer has expired
    if (new Date() > new Date(offer.expiresAt)) {
      await prisma.sitterPoolOffer.update({
        where: { id: offerId },
        data: { status: "expired" },
      });
      return NextResponse.json({ error: "Offer has expired" }, { status: 400 });
    }

    // Parse existing responses
    const existingResponses = JSON.parse(offer.responses || "[]");
    
    // Check if this sitter has already responded
    const hasResponded = existingResponses.some((r: any) => r.sitterId === sitterId);
    if (hasResponded) {
      return NextResponse.json({ error: "You have already responded to this offer" }, { status: 400 });
    }
    
    // Add new response
    const newResponse = {
      sitterId,
      response,
      respondedAt: new Date().toISOString(),
    };
    
    existingResponses.push(newResponse);

    // Update offer with response
    const updatedOffer = await prisma.sitterPoolOffer.update({
      where: { id: offerId },
      data: {
        responses: JSON.stringify(existingResponses),
      },
    });

    // If accepted, assign sitter and close offer (first-response-wins)
    if (response.toLowerCase() === "yes" || response.toLowerCase() === "accept") {
      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Update booking with sitter assignment
        await tx.booking.update({
          where: { id: offer.bookingId },
          data: {
            sitterId,
            status: "confirmed",
          },
        });

        // Close the offer
        await tx.sitterPoolOffer.update({
          where: { id: offerId },
          data: {
            status: "accepted",
            acceptedSitterId: sitterId,
          },
        });
      });

      // Get sitter details for notification
      const sitter = await prisma.sitter.findUnique({
        where: { id: sitterId },
      });

      // Notify other sitters that offer is no longer available
      const sitterIds = JSON.parse(offer.sitterIds);
      const otherSitterIds = sitterIds.filter((id: string) => id !== sitterId);
      
      if (otherSitterIds.length > 0) {
        const otherSitters = await prisma.sitter.findMany({
          where: { id: { in: otherSitterIds } },
        });

        const notificationPromises = otherSitters.map(async (otherSitter) => {
          try {
            const notificationMessage = `The booking opportunity for ${offer.booking.firstName} ${offer.booking.lastName} has been accepted by another sitter. Thank you for your interest!`;
            await sendSMS(otherSitter.phone, notificationMessage);
            
            // Log the notification
            await prisma.message.create({
              data: {
                direction: "outbound",
                body: notificationMessage,
                status: "sent",
                bookingId: offer.bookingId,
                from: "system",
                to: otherSitter.phone,
              },
            });
          } catch (error) {
            console.error(`Failed to notify sitter ${otherSitter.id}:`, error);
          }
        });

        await Promise.allSettled(notificationPromises);
      }

      // Send confirmation to the accepted sitter
      if (sitter) {
        try {
          const confirmationMessage = `Congratulations! You've been assigned the booking for ${offer.booking.firstName} ${offer.booking.lastName}. Please check your dashboard for details.`;
          await sendSMS(sitter.phone, confirmationMessage);
          
          await prisma.message.create({
            data: {
              direction: "outbound",
              body: confirmationMessage,
              status: "sent",
              bookingId: offer.bookingId,
              from: "system",
              to: sitter.phone,
            },
          });
        } catch (error) {
          console.error(`Failed to send confirmation to sitter ${sitterId}:`, error);
        }
      }
    }

    return NextResponse.json({ offer: updatedOffer });
  } catch (error) {
    console.error("Failed to respond to sitter pool offer:", error);
    return NextResponse.json(
      { error: "Failed to respond to offer" },
      { status: 500 }
    );
  }
}