import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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

    // Update offer with response
    const updatedOffer = await prisma.sitterPoolOffer.update({
      where: { id: offerId },
      data: {
        responses: {
          push: {
            sitterId,
            response,
            respondedAt: new Date(),
          },
        },
      },
    });

    // If accepted, assign sitter and close offer
    if (response === "accepted") {
      await prisma.booking.update({
        where: { id: offer.bookingId },
        data: {
          sitterId,
          status: "confirmed",
        },
      });

      await prisma.sitterPoolOffer.update({
        where: { id: offerId },
        data: {
          status: "accepted",
          acceptedSitterId: sitterId,
        },
      });

      // Notify other sitters that offer is no longer available
      // This would typically send SMS notifications
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