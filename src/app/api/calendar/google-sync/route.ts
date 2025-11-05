import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// TODO: CalendarEvent model doesn't exist in schema. This route should sync to Google Calendar API
// using createGoogleCalendarEvent from @/lib/google-calendar instead of storing in database.
// Leaving commented out to preserve current behavior until CalendarEvent model is added or
// implementation is updated to use Google Calendar API directly.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, calendarAccountId } = body;

    if (!bookingId || !calendarAccountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: CalendarEvent model doesn't exist in schema. This route should sync to Google Calendar API
    // using createGoogleCalendarEvent from @/lib/google-calendar instead of storing in database.
    // Currently returning error to preserve function signature until implementation is fixed.
    
    return NextResponse.json(
      { error: "Calendar sync not implemented - CalendarEvent model missing" },
      { status: 501 }
    );

    /* Commented out until CalendarEvent model is added:
    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get calendar account
    const account = await prisma.calendarAccount.findUnique({
      where: { id: calendarAccountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Calendar account not found" }, { status: 404 });
    }

    // Create calendar event
    const event = await prisma.calendarEvent.create({
      data: {
        bookingId,
        calendarAccountId,
        title: `${booking.service} - ${booking.firstName} ${booking.lastName}`,
        description: `Pet care service for ${booking.pets.map(p => p.species).join(', ')}`,
        startAt: booking.startAt,
        endAt: booking.endAt,
        location: booking.address,
        isAllDay: false,
      },
    });

    return NextResponse.json({ event });
    */
  } catch (error) {
    console.error("Failed to sync booking to calendar:", error);
    return NextResponse.json(
      { error: "Failed to sync to calendar" },
      { status: 500 }
    );
  }
}