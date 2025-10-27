import { NextRequest, NextResponse } from "next/server";
import { fetchOwnerCalendarEvents } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    const events = await fetchOwnerCalendarEvents({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch owner calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
