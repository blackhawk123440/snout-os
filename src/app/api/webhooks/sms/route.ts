import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPhoneForAPI } from "@/lib/phone-format";
import { formatPetsByQuantity, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage, calculatePriceBreakdown } from "@/lib/booking-utils";
import { getOwnerPhone, getSitterPhone } from "@/lib/phone-utils";
import { sendMessage } from "@/lib/message-utils";
import { verifyOpenPhoneSignatureFromEnv } from "@/lib/openphone-verify";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // OpenPhone webhook format may vary, adjust based on actual webhook payload
    // Typical format: { from: "+1234567890", to: "+1234567890", text: "YES", ... }
    const from = body.from || body.source || body.phoneNumber || body.fromNumber;
    const messageText = body.text || body.body || body.message || body.content;
    
    if (!from || !messageText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Normalize phone number
    const normalizedFrom = formatPhoneForAPI(from);
    
    // Find sitter by phone number
    const sitter = await prisma.sitter.findFirst({
      where: {
        OR: [
          { phone: normalizedFrom },
          { phone: from },
          { phone: from.replace(/\+/g, '') },
          { phone: from.replace(/\+1/g, '') },
        ],
      },
    });

    if (!sitter) {
      return NextResponse.json({ message: "Sitter not found" }, { status: 200 });
    }

    // Check if message contains "yes" or "accept"
    const normalizedMessage = messageText.toLowerCase().trim();
    const isAcceptance = normalizedMessage === "yes" || 
                        normalizedMessage === "y" || 
                        normalizedMessage === "accept" ||
                        normalizedMessage.startsWith("yes") ||
                        normalizedMessage === "i accept";

    // Find active sitter pool offers for this sitter
    const activeOffers = await prisma.sitterPoolOffer.findMany({
      where: {
        status: "active",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        booking: {
          include: {
            pets: true,
          },
        },
      },
    });

    // Filter offers that include this sitter
    const offersForSitter = activeOffers.filter((offer) => {
      try {
        const sitterIds = JSON.parse(offer.sitterIds || "[]");
        return sitterIds.includes(sitter.id);
      } catch {
        return false;
      }
    });

    if (offersForSitter.length === 0) {
      // No active offers for this sitter
      return NextResponse.json({ message: "No active offers found" }, { status: 200 });
    }

    // Process responses to all offers (but only first YES wins for each offer)
    const results = [];
    
    for (const offer of offersForSitter) {
      try {
        // Check if sitter has already responded
        const existingResponses = JSON.parse(offer.responses || "[]");
        const hasResponded = existingResponses.some((r: any) => r.sitterId === sitter.id);
        
        if (hasResponded) {
          continue; // Skip if already responded
        }

        // If not acceptance, just log the response and continue
        if (!isAcceptance) {
          const newResponse = {
            sitterId: sitter.id,
            response: "no",
            respondedAt: new Date().toISOString(),
          };
          
          existingResponses.push(newResponse);

          await prisma.sitterPoolOffer.update({
            where: { id: offer.id },
            data: {
              responses: JSON.stringify(existingResponses),
            },
          });
          
          continue; // Skip processing for non-acceptance
        }

        // If accepted, handle it directly (first YES wins)
        if (isAcceptance) {
          // Check if offer is still active (atomic check)
          const currentOffer = await prisma.sitterPoolOffer.findUnique({
            where: { id: offer.id },
          });

          if (!currentOffer || currentOffer.status !== "active") {
            continue; // Skip if already taken
          }

          // Use a transaction to ensure atomicity (first YES wins)
          try {
            const result = await prisma.$transaction(async (tx) => {
              // Re-check offer status inside transaction
              const lockOffer = await tx.sitterPoolOffer.findUnique({
                where: { id: offer.id },
              });

              if (!lockOffer || lockOffer.status !== "active") {
                throw new Error("Offer already accepted");
              }

              // Update booking with sitter assignment
              const updatedBooking = await tx.booking.update({
                where: { id: offer.bookingId },
                data: {
                  sitterId: sitter.id,
                  status: "confirmed",
                  paymentStatus: "paid",
                },
                include: {
                  pets: true,
                  sitter: true,
                },
              });

              // Add response to offer and close it
              const existingResponses = JSON.parse(offer.responses || "[]");
              const newResponse = {
                sitterId: sitter.id,
                response: "yes",
                respondedAt: new Date().toISOString(),
              };
              existingResponses.push(newResponse);

              await tx.sitterPoolOffer.update({
                where: { id: offer.id },
                data: {
                  status: "accepted",
                  acceptedSitterId: sitter.id,
                  responses: JSON.stringify(existingResponses),
                },
              });

              return updatedBooking;
            });

            // Notify other sitters that offer is no longer available
            const sitterIds = JSON.parse(offer.sitterIds || "[]");
            const otherSitterIds = sitterIds.filter((id: string) => id !== sitter.id);
            
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

                  // Simple notification message (no template needed for this)
                  const notificationMessage = `📱 JOB TAKEN\n\nThe booking opportunity for ${offer.booking.firstName} ${offer.booking.lastName} has been accepted by another sitter. Thank you for your interest!`;
                  
                  await sendMessage(sitterPhone, notificationMessage, offer.bookingId);
                } catch (error) {
                  console.error(`Failed to notify sitter ${otherSitter.id}:`, error);
                }
              });

              await Promise.allSettled(notificationPromises);
            }

            // Get result with timeSlots for proper formatting
            const resultWithSlots = await prisma.booking.findUnique({
              where: { id: offer.bookingId },
              include: {
                pets: true,
                sitter: true,
                timeSlots: {
                  orderBy: {
                    startAt: "asc",
                  },
                },
              },
            });

            // Format dates and times using the shared function that matches booking details
            const formattedDatesTimes = resultWithSlots ? formatDatesAndTimesForMessage({
              service: result.service,
              startAt: result.startAt,
              endAt: result.endAt,
              timeSlots: resultWithSlots.timeSlots || [],
            }) : "";

            // Send confirmation to the accepted sitter
            try {
              const sitterPhone = await getSitterPhone(sitter.id, undefined, "sitterPoolOffers");
              if (sitterPhone) {
                const petQuantities = formatPetsByQuantity(result.pets);
                
                // Calculate sitter earnings based on their commission percentage
                const breakdown = calculatePriceBreakdown(result);
                const calculatedTotal = breakdown.total;
                const commissionPercentage = sitter.commissionPercentage || 80.0;
                const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;
                
                // Check if automation is enabled
                const shouldSendToSitter = await shouldSendToRecipient("sitterPoolOffers", "sitter");
                
                let confirmationMessage: string;
                if (shouldSendToSitter) {
                  // Use automation template if available
                  let sitterTemplate = await getMessageTemplate("sitterPoolOffers", "sitter");
                  // If template is null (doesn't exist) or empty string, use default
                  if (!sitterTemplate || sitterTemplate.trim() === "") {
                    sitterTemplate = "🎉 CONGRATULATIONS!\n\nYou've been assigned:\n\n{{service}} for {{firstName}} {{lastName}}\n\n{{datesTimes}}\n\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nPlease confirm your availability.";
                  }
                  
                  confirmationMessage = replaceTemplateVariables(sitterTemplate, {
                    service: result.service,
                    firstName: result.firstName,
                    lastName: result.lastName,
                    datesTimes: formattedDatesTimes,
                    date: formatDateForMessage(result.startAt),
                    time: formatTimeForMessage(result.startAt),
                    petQuantities,
                    address: result.address || 'TBD',
                    earnings: sitterEarnings.toFixed(2),
                    totalPrice: calculatedTotal, // Pass actual total so earnings can be calculated
                    total: calculatedTotal,
                  }, {
                    isSitterMessage: true,
                    sitterCommissionPercentage: commissionPercentage,
                  });
                } else {
                  // Fallback to hardcoded message if automation disabled
                  confirmationMessage = `🎉 CONGRATULATIONS!\n\nYou've been assigned:\n\n${result.service} for ${result.firstName} ${result.lastName}\n\n${formattedDatesTimes}\n\nPets: ${petQuantities}\nAddress: ${result.address || 'TBD'}\nYour Earnings: $${sitterEarnings.toFixed(2)}\n\nPlease confirm your availability.`;
                }
                
                await sendMessage(sitterPhone, confirmationMessage, offer.bookingId);
              }
            } catch (error) {
              console.error(`Failed to send confirmation to sitter ${sitter.id}:`, error);
            }

            // Notify owner that someone accepted the job
            try {
              const ownerPhone = await getOwnerPhone(undefined, "sitterPoolOffers");
              if (ownerPhone) {
                const petQuantities = formatPetsByQuantity(result.pets);
                const sitterPhone = await getSitterPhone(sitter.id, undefined, "sitterPoolOffers");
                
                // Check if automation is enabled
                const shouldSendToOwner = await shouldSendToRecipient("sitterPoolOffers", "owner");
                
                let ownerMessage: string;
                if (shouldSendToOwner) {
                  // Use automation template if available
                  let ownerTemplate = await getMessageTemplate("sitterPoolOffers", "owner");
                  // If template is null (doesn't exist) or empty string, use default
                  if (!ownerTemplate || ownerTemplate.trim() === "") {
                    ownerTemplate = "✅ SITTER ACCEPTED JOB\n\n{{sitterFirstName}} {{sitterLastName}} has accepted the booking:\n\n{{service}} for {{firstName}} {{lastName}}\n\n{{datesTimes}}\n\nPets: {{petQuantities}}\n\nSitter: {{sitterFirstName}} {{sitterLastName}}\nPhone: {{sitterPhone}}";
                  }
                  
                  ownerMessage = replaceTemplateVariables(ownerTemplate, {
                    sitterFirstName: sitter.firstName,
                    sitterLastName: sitter.lastName,
                    service: result.service,
                    firstName: result.firstName,
                    lastName: result.lastName,
                    datesTimes: formattedDatesTimes,
                    date: formatDateForMessage(result.startAt),
                    time: formatTimeForMessage(result.startAt),
                    petQuantities,
                    sitterPhone: sitterPhone || sitter.phone,
                  });
                } else {
                  // Fallback to hardcoded message if automation disabled
                  ownerMessage = `✅ SITTER ACCEPTED JOB\n\n${sitter.firstName} ${sitter.lastName} has accepted the booking:\n\n${result.service} for ${result.firstName} ${result.lastName}\n\n${formattedDatesTimes}\n\nPets: ${petQuantities}\n\nSitter: ${sitter.firstName} ${sitter.lastName}\nPhone: ${sitterPhone || sitter.phone}`;
                }
                
                await sendMessage(ownerPhone, ownerMessage, offer.bookingId);
              }
            } catch (error) {
              console.error(`Failed to notify owner:`, error);
            }

            results.push({ offerId: offer.id, status: "accepted" });
          } catch (error: any) {
            if (error.message === "Offer already accepted") {
              results.push({ offerId: offer.id, status: "already_taken" });
            } else {
              console.error(`Failed to process acceptance for offer ${offer.id}:`, error);
              results.push({ offerId: offer.id, status: "error" });
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process offer ${offer.id}:`, error);
        results.push({ offerId: offer.id, status: "error" });
      }
    }

    return NextResponse.json({ 
      message: "SMS processed", 
      sitterId: sitter.id,
      results,
    }, { status: 200 });
  } catch (error) {
    console.error("Failed to process SMS webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

