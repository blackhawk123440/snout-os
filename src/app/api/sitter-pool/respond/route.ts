import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage, calculatePriceBreakdown } from "@/lib/booking-utils";
import { getSitterPhone, getOwnerPhone } from "@/lib/phone-utils";
import { sendMessage } from "@/lib/message-utils";

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
    if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
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

    // Handle decline responses
    if (response.toLowerCase() === "no" || response.toLowerCase() === "decline" || response.toLowerCase() === "n" || response.toLowerCase() === "nooo" || response.toLowerCase() === "noooo") {
      // Just record the decline - don't close the offer
      return NextResponse.json({ offer: updatedOffer, message: "Your decline has been recorded." });
    }

    // If accepted, assign sitter and close offer (first-response-wins)
    if (response.toLowerCase() === "yes" || response.toLowerCase() === "accept" || response.toLowerCase() === "y") {
      // Check if offer is still active (atomic check)
      const currentOffer = await prisma.sitterPoolOffer.findUnique({
        where: { id: offerId },
      });

      if (!currentOffer || currentOffer.status !== "active") {
        return NextResponse.json({ error: "Offer is no longer available" }, { status: 400 });
      }

      // Use a transaction to ensure atomicity (first YES wins)
      const result = await prisma.$transaction(async (tx) => {
        // Re-check offer status inside transaction
        const lockOffer = await tx.sitterPoolOffer.findUnique({
          where: { id: offerId },
        });

        if (!lockOffer || lockOffer.status !== "active") {
          throw new Error("Offer already accepted");
        }

        // Update booking with sitter assignment
        const updatedBooking = await tx.booking.update({
          where: { id: offer.bookingId },
          data: {
            sitterId,
            status: "confirmed",
            paymentStatus: "paid", // Set payment status to paid when confirmed
          },
          include: {
            pets: true,
            sitter: true,
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

        return updatedBooking;
      });

      // Get sitter details for notification
      const sitter = await prisma.sitter.findUnique({
        where: { id: sitterId },
      });

      // Get booking with timeSlots for proper formatting
      const bookingWithSlots = await prisma.booking.findUnique({
        where: { id: offer.bookingId },
        include: {
          timeSlots: {
            orderBy: {
              startAt: "asc",
            },
          },
        },
      });

      // Notify other sitters that offer is no longer available
      const sitterIds = JSON.parse(offer.sitterIds || "[]");
      const otherSitterIds = sitterIds.filter((id: string) => id !== sitterId);
      
      if (otherSitterIds.length > 0) {
        const otherSitters = await prisma.sitter.findMany({
          where: { id: { in: otherSitterIds } },
        });

        const notificationPromises = otherSitters.map(async (otherSitter) => {
          try {
            const sitterPhone = await getSitterPhone(otherSitter.id, undefined, "sitterPoolOffers");
            if (!sitterPhone) {
              console.error(`No phone number found for sitter ${otherSitter.id}`);
              return;
            }

            const notificationMessage = `📱 JOB TAKEN\n\nThe booking opportunity for ${offer.booking.firstName} ${offer.booking.lastName} has been accepted by another sitter. Thank you for your interest!`;
            
            await sendMessage(sitterPhone, notificationMessage, offer.bookingId);
          } catch (error) {
            console.error(`Failed to notify sitter ${otherSitter.id}:`, error);
          }
        });

        await Promise.allSettled(notificationPromises);
      }

      // Send confirmation to the accepted sitter
      if (sitter && bookingWithSlots) {
        try {
          const sitterPhone = await getSitterPhone(sitterId, undefined, "sitterPoolOffers");
          if (sitterPhone) {
            const petQuantities = formatPetsByQuantity(result.pets);
            
            // Format dates and times using the shared function
            const formattedDatesTimes = formatDatesAndTimesForMessage({
              service: result.service,
              startAt: result.startAt,
              endAt: result.endAt,
              timeSlots: bookingWithSlots.timeSlots || [],
            });
            
            // Calculate sitter earnings based on their commission percentage
            const breakdown = calculatePriceBreakdown(result);
            const calculatedTotal = breakdown.total;
            const commissionPercentage = sitter.commissionPercentage || 80.0;
            const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;
            
            const confirmationMessage = `🎉 CONGRATULATIONS!\n\nYou've been assigned:\n\n${result.service} for ${result.firstName} ${result.lastName}\n${formattedDatesTimes}\n\nPets: ${petQuantities}\nAddress: ${result.address || 'TBD'}\nYour Earnings: $${sitterEarnings.toFixed(2)}\n\nPlease confirm your availability.`;
            
            await sendMessage(sitterPhone, confirmationMessage, offer.bookingId);
          }
        } catch (error) {
          console.error(`Failed to send confirmation to sitter ${sitterId}:`, error);
        }
      }

      // Notify owner that someone accepted the job
      try {
        const ownerPhone = await getOwnerPhone(undefined, "sitterPoolOffers");
        if (ownerPhone && sitter && bookingWithSlots) {
          const petQuantities = formatPetsByQuantity(result.pets);
          
          // Format dates and times using the shared function
          const formattedDatesTimes = formatDatesAndTimesForMessage({
            service: result.service,
            startAt: result.startAt,
            endAt: result.endAt,
            timeSlots: bookingWithSlots.timeSlots || [],
          });
          
          const sitterPhone = await getSitterPhone(sitterId, undefined, "sitterPoolOffers");
          
          const ownerMessage = `✅ SITTER ACCEPTED JOB\n\n${sitter.firstName} ${sitter.lastName} has accepted the booking:\n\n${result.service} for ${result.firstName} ${result.lastName}\n${formattedDatesTimes}\n\nPets: ${petQuantities}\n\nSitter: ${sitter.firstName} ${sitter.lastName}\nPhone: ${sitterPhone || sitter.phone}`;
          
          await sendMessage(ownerPhone, ownerMessage, offer.bookingId);
        }
      } catch (error) {
        console.error(`Failed to notify owner:`, error);
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