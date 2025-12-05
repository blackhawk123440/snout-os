import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emitSitterAssigned } from "@/lib/event-emitter";

/**
 * POST /api/sitters/[id]/dashboard/accept
 * Accept a sitter pool job (atomic operation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sitterId } = await params;
    const body = await request.json();
    const { poolOfferId } = body;

    if (!poolOfferId) {
      return NextResponse.json(
        { error: "poolOfferId is required" },
        { status: 400 }
      );
    }

    // Get the offer with booking
    const offer = await prisma.sitterPoolOffer.findUnique({
      where: { id: poolOfferId },
      include: {
        booking: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Verify this sitter is in the pool
    const sitterIds = JSON.parse(offer.sitterIds || "[]");
    if (!sitterIds.includes(sitterId) && offer.sitterId !== sitterId) {
      return NextResponse.json(
        { error: "You are not part of this pool offer" },
        { status: 403 }
      );
    }

    // Atomic acceptance using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-check offer status inside transaction (pessimistic locking)
      const lockOffer = await tx.sitterPoolOffer.findUnique({
        where: { id: poolOfferId },
      });

      if (!lockOffer) {
        throw new Error("Offer not found");
      }

      // Check if already accepted
      if (lockOffer.status !== "active") {
        throw new Error("Offer is no longer active");
      }

      // Check if expired
      if (lockOffer.expiresAt && new Date(lockOffer.expiresAt) < new Date()) {
        // Mark as expired
        await tx.sitterPoolOffer.update({
          where: { id: poolOfferId },
          data: { status: "expired" },
        });
        throw new Error("Offer has expired");
      }

      // Check if already accepted by someone else
      if (lockOffer.acceptedSitterId && lockOffer.acceptedSitterId !== sitterId) {
        throw new Error("Offer already accepted by another sitter");
      }

      // Update booking with sitter assignment
      const updatedBooking = await tx.booking.update({
        where: { id: offer.bookingId },
        data: {
          sitterId,
          status: "confirmed",
          assignmentType: "pool",
        },
        include: {
          pets: true,
          timeSlots: true,
          client: true,
        },
      });

      // Close the offer
      await tx.sitterPoolOffer.update({
        where: { id: poolOfferId },
        data: {
          status: "accepted",
          acceptedSitterId: sitterId,
        },
      });

      return updatedBooking;
    });

    // Emit event
    await emitSitterAssigned(result, { id: sitterId, firstName: "", lastName: "" });

    return NextResponse.json({
      success: true,
      booking: result,
    });
  } catch (error: any) {
    console.error("Failed to accept pool job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept job" },
      { status: 400 }
    );
  }
}

