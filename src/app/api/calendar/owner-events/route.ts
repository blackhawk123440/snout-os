import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// TODO: CalendarEvent model doesn't exist in schema. This route should be updated to use
// Google Calendar API directly or CalendarEvent model needs to be added to schema.

export async function GET() {
  try {
    // TODO: CalendarEvent model doesn't exist - returning empty array to preserve function signature
    return NextResponse.json({ events: [] });
    
    /* Commented out until CalendarEvent model is added:
    const events = await prisma.calendarEvent.findMany({
      include: {
        booking: {
          include: {
            pets: true,
            sitter: true,
          },
        },
        calendarAccount: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return NextResponse.json({ events });
    */
  } catch (error) {
    console.error("Failed to fetch owner events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
