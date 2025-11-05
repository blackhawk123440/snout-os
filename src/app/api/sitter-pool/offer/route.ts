import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity } from "@/lib/booking-utils";
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
    
    // Check if booking has time slots (Drop-ins, Walks, Pet Taxi) or date range (House Sitting, 24/7 Care)
    const hasTimeSlots = booking.timeSlots && booking.timeSlots.length > 0;
    const isHouseSittingService = booking.service === "House Sitting" || booking.service === "24/7 Care";
    
    // Build date/time information
    let dateTimeInfo = "";
    
    if (hasTimeSlots) {
      // Group time slots by date
      const slotsByDate: Record<string, Array<{ start: Date; end: Date }>> = {};
      booking.timeSlots.forEach((slot) => {
        const slotDate = new Date(slot.startAt).toLocaleDateString();
        if (!slotsByDate[slotDate]) {
          slotsByDate[slotDate] = [];
        }
        slotsByDate[slotDate].push({
          start: new Date(slot.startAt),
          end: new Date(slot.endAt),
        });
      });
      
      // Format all dates and times
      const dateTimeEntries = Object.entries(slotsByDate).map(([date, slots]) => {
        const timeSlots = slots.map((slot) => {
          const startTime = slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const endTime = slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `${startTime} - ${endTime}`;
        }).join(", ");
        return `${date}: ${timeSlots}`;
      });
      
      dateTimeInfo = dateTimeEntries.join("\n");
    } else if (isHouseSittingService) {
      // For House Sitting/24-7 Care, show start and end dates with times
      const startDate = new Date(booking.startAt).toLocaleDateString();
      const startTime = new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endDate = new Date(booking.endAt).toLocaleDateString();
      const endTime = new Date(booking.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      dateTimeInfo = `Start: ${startDate} at ${startTime}\nEnd: ${endDate} at ${endTime}`;
    } else {
      // Fallback to single date/time
      const startDate = new Date(booking.startAt).toLocaleDateString();
      const startTime = new Date(booking.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dateTimeInfo = `${startDate} at ${startTime}`;
    }
    
    // Send SMS to all selected sitters using their phone numbers
    const smsPromises = sitters.map(async (sitter) => {
      try {
        const sitterPhone = await getSitterPhone(sitter.id, undefined, "sitterPoolOffers");
        if (!sitterPhone) {
          console.error(`No phone number found for sitter ${sitter.id}`);
          return;
        }

        const smsMessage = `🐾 NEW BOOKING OPPORTUNITY\n\n${booking.service} for ${booking.firstName} ${booking.lastName}\n\nDates & Times:\n${dateTimeInfo}\n\nPets: ${petQuantities}\nAddress: ${booking.address || 'TBD'}\n\nReply YES to accept this booking opportunity!`;
        
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