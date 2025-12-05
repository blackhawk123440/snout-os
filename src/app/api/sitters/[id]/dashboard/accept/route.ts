import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emitSitterAssigned } from "@/lib/event-emitter";
import { formatClientNameForSitter, formatPetsByQuantity, formatDatesAndTimesForMessage, calculatePriceBreakdown } from "@/lib/booking-utils";
import { getSitterPhone, getOwnerPhone } from "@/lib/phone-utils";
import { sendMessage } from "@/lib/message-utils";

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

    // Get sitter details
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Emit event
    await emitSitterAssigned(result, sitter);

    // Notify other sitters in the pool
    const sitterIds = JSON.parse(offer.sitterIds || "[]");
    const otherSitterIds = sitterIds.filter((id: string) => id !== sitterId);
    
    if (otherSitterIds.length > 0) {
      const otherSitters = await prisma.sitter.findMany({
        where: { id: { in: otherSitterIds } },
      });

      const notificationPromises = otherSitters.map(async (otherSitter) => {
        try {
          const sitterPhone = await getSitterPhone(otherSitter.id, undefined, "sitterPoolOffers");
          if (!sitterPhone) return;

          const clientName = formatClientNameForSitter(result.firstName || "", result.lastName || "");
          const notificationMessage = `📱 JOB TAKEN\n\nThe booking opportunity for ${clientName} has been accepted by another sitter. Thank you for your interest!`;
          
          await sendMessage(sitterPhone, notificationMessage, result.id);
        } catch (error) {
          console.error(`Failed to notify sitter ${otherSitter.id}:`, error);
        }
      });

      await Promise.allSettled(notificationPromises);
    }

    // Notify owner
    try {
      const ownerPhone = await getOwnerPhone(undefined, "sitterPoolOffers");
      if (ownerPhone && result.timeSlots) {
        const petQuantities = formatPetsByQuantity(result.pets);
        const formattedDatesTimes = formatDatesAndTimesForMessage({
          service: result.service,
          startAt: result.startAt,
          endAt: result.endAt,
          timeSlots: result.timeSlots || [],
        });
        
        const sitterPhone = await getSitterPhone(sitterId, undefined, "sitterPoolOffers");
        const ownerMessage = `✅ SITTER ACCEPTED JOB\n\n${sitter.firstName} ${sitter.lastName} has accepted the booking:\n\n${result.service} for ${result.firstName} ${result.lastName}\n${formattedDatesTimes}\n\nPets: ${petQuantities}\n\nSitter: ${sitter.firstName} ${sitter.lastName}\nPhone: ${sitterPhone || sitter.phone}`;
        
        await sendMessage(ownerPhone, ownerMessage, result.id);
      }
    } catch (error) {
      console.error(`Failed to notify owner:`, error);
    }

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

