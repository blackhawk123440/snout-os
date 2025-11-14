import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage, calculatePriceBreakdown } from "@/lib/booking-utils";
import { getSitterPhone } from "@/lib/phone-utils";
import { sendMessage } from "@/lib/message-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";

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
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
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

    // Format booking details for SMS
    const petQuantities = formatPetsByQuantity(booking.pets);
    
    // Format dates and times using the shared function that matches booking details
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });
    
    // Calculate price breakdown for accurate total
    const breakdown = calculatePriceBreakdown(booking);
    const calculatedTotal = breakdown.total;

    // Check if automation is enabled
    const shouldSendToSitters = await shouldSendToRecipient("sitterPoolOffers", "sitter");

    // Send SMS to all selected sitters using their phone numbers
    const smsPromises = sitters.map(async (sitter) => {
      try {
        const sitterPhone = await getSitterPhone(sitter.id, undefined, "sitterPoolOffers");
        if (!sitterPhone) {
          console.error(`No phone number found for sitter ${sitter.id}`);
          return;
        }

        // Calculate sitter earnings based on their commission percentage
        const commissionPercentage = sitter.commissionPercentage || 80.0;
        const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;

        let smsMessage: string;
        if (shouldSendToSitters) {
          // Use automation template if available
          let sitterTemplate = await getMessageTemplate("sitterPoolOffers", "sitter");
          // If template is null (doesn't exist) or empty string, use default
          if (!sitterTemplate || sitterTemplate.trim() === "") {
            sitterTemplate = "🐾 NEW BOOKING OPPORTUNITY\n\n{{service}} for {{firstName}} {{lastName}}\n\nDates & Times:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nReply YES to accept this booking opportunity!";
          }
          
          smsMessage = replaceTemplateVariables(sitterTemplate, {
            service: booking.service,
            firstName: booking.firstName,
            lastName: booking.lastName,
            datesTimes: formattedDatesTimes,
            date: formatDateForMessage(booking.startAt),
            time: formatTimeForMessage(booking.startAt),
            petQuantities,
            address: booking.address || 'TBD',
            earnings: sitterEarnings.toFixed(2),
            totalPrice: calculatedTotal, // Pass actual total so earnings can be calculated
            total: calculatedTotal,
          }, {
            isSitterMessage: true,
            sitterCommissionPercentage: commissionPercentage,
          });
        } else {
          // Fallback to hardcoded message if automation disabled
          smsMessage = `🐾 NEW BOOKING OPPORTUNITY\n\n${booking.service} for ${booking.firstName} ${booking.lastName}\n\nDates & Times:\n${formattedDatesTimes}\n\nPets: ${petQuantities}\nAddress: ${booking.address || 'TBD'}\nYour Earnings: $${sitterEarnings.toFixed(2)}\n\nReply YES to accept this booking opportunity!`;
        }
        
        await sendMessage(sitterPhone, smsMessage, bookingId);
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