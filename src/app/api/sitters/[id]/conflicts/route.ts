import { NextRequest, NextResponse } from "next/server";
import { checkSitterConflicts } from "@/lib/google-calendar";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sitterId } = await params;
    const body = await request.json();
    const { startAt, endAt, excludeBookingId } = body;

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: "Start and end times are required" },
        { status: 400 }
      );
    }

    const result = await checkSitterConflicts({
      sitterId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      excludeBookingId,
    });

    return NextResponse.json(
      {
        hasConflict: result.hasConflict,
        conflictingBookings: result.conflictingBookings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to check conflicts:", error);
    return NextResponse.json(
      { error: "Failed to check conflicts" },
      { status: 500 }
    );
  }
}

