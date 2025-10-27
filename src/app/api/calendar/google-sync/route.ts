import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  try {
    // Get all confirmed bookings that aren't completed
    const bookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ["Confirmed", "Pending"],
        },
      },
      include: {
        pets: true,
        sitter: true,
      },
    });

    let synced = 0;
    let failed = 0;

    for (const booking of bookings) {
      const petNames = booking.pets.map((p) => p.name).join(", ");
      const sitterName = booking.sitter 
        ? `${booking.sitter.firstName} ${booking.sitter.lastName}`
        : "Unassigned";

      const summary = `${booking.service} - ${booking.firstName} ${booking.lastName}`;
      const description = `Service: ${booking.service}${booking.minutes ? ` (${booking.minutes} min)` : ""}
Pets: ${petNames}
Sitter: ${sitterName}
Client: ${booking.firstName} ${booking.lastName}
Phone: ${booking.phone}
${booking.address ? `Address: ${booking.address}` : ""}
Quote: $${booking.totalPrice?.toFixed(2) || "TBD"}`;

      const googleEventId = await syncBookingToGoogleCalendar({
        bookingId: booking.id,
        summary,
        description,
        location: booking.address || undefined,
        startAt: booking.startAt,
        endAt: booking.endAt,
      });

      if (googleEventId) {
        synced++;
      } else {
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        synced,
        failed,
        total: bookings.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to sync calendar:", error);
    return NextResponse.json(
      { error: "Failed to sync with Google Calendar" },
      { status: 500 }
    );
  }
}

