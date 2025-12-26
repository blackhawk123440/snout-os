pimport { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, formatDatesAndTimesForMessage, calculatePriceBreakdown, formatClientNameForSitter } from "@/lib/booking-utils";
import { getSitterPhone } from "@/lib/phone-utils";
import { sendMessage } from "@/lib/message-utils";

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

    if (sitters.length === 0) {
      console.error(`No sitters found for IDs: ${sitterIds.join(', ')}`);
      return NextResponse.json(
        { error: `No sitters found for the provided IDs` },
        { status: 404 }
      );
    }

    console.log(`Found ${sitters.length} sitters to send offers to`);

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

    // Format booking details for SMS using shared formatting functions
    const petQuantities = formatPetsByQuantity(booking.pets);
    
    // Format dates and times using the shared function that matches booking details
    const dateTimeInfo = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });
    
    // Calculate price breakdown for accurate total
    const breakdown = calculatePriceBreakdown(booking);
    const calculatedTotal = breakdown.total;

    // Send SMS to all selected sitters using their phone numbers
    const smsResults: Array<{ sitterId: string; success: boolean; error?: string }> = [];
    const smsPromises = sitters.map(async (sitter) => {
      try {
        const sitterPhone = await getSitterPhone(sitter.id, undefined, "sitterPoolOffers");
        if (!sitterPhone) {
          const errorMsg = `No phone number found for sitter ${sitter.id} (${sitter.firstName} ${sitter.lastName})`;
          console.error(errorMsg);
          smsResults.push({ sitterId: sitter.id, success: false, error: errorMsg });
          return;
        }

        console.log(`Sending SMS to sitter ${sitter.id} at ${sitterPhone}`);

        // Calculate sitter earnings based on their commission percentage
        const commissionPercentage = sitter.commissionPercentage || 80.0;
        const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;

        const clientName = formatClientNameForSitter(booking.firstName, booking.lastName);
        const smsMessage = `🐾 NEW BOOKING OPPORTUNITY\n\n${booking.service} for ${clientName}\n\nDates & Times:\n${dateTimeInfo}\n\nPets: ${petQuantities}\nAddress: ${booking.address || 'TBD'}\nYour Earnings: $${sitterEarnings.toFixed(2)}\n\nReply YES to accept, NO to decline.`;
        
        const messageResult = await sendMessage(sitterPhone, smsMessage, bookingId);
        if (messageResult) {
          console.log(`Successfully sent SMS to sitter ${sitter.id}`);
          smsResults.push({ sitterId: sitter.id, success: true });
        } else {
          const errorMsg = `Failed to send SMS to sitter ${sitter.id}`;
          console.error(errorMsg);
          smsResults.push({ sitterId: sitter.id, success: false, error: errorMsg });
        }
      } catch (error) {
        const errorMsg = `Failed to send SMS to sitter ${sitter.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg, error);
        smsResults.push({ sitterId: sitter.id, success: false, error: errorMsg });
      }
    });

    // Wait for all SMS to be sent (don't fail the request if SMS fails)
    await Promise.allSettled(smsPromises);

    const successCount = smsResults.filter(r => r.success).length;
    const failureCount = smsResults.filter(r => !r.success).length;
    console.log(`SMS sending complete: ${successCount} successful, ${failureCount} failed`);

    if (failureCount > 0) {
      console.error('Failed SMS results:', smsResults.filter(r => !r.success));
    }

    return NextResponse.json({ 
      offer,
      smsResults: {
        total: smsResults.length,
        successful: successCount,
        failed: failureCount,
        details: smsResults
      }
    });
  } catch (error) {
    console.error("Failed to create sitter pool offer:", error);
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    );
  }
}