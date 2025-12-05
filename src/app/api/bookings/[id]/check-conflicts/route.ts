import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectBookingConflicts } from "@/lib/booking-engine";

/**
 * POST /api/bookings/[id]/check-conflicts
 * Check for conflicts with a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { timeSlots, address, sitterId } = body;

    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return NextResponse.json(
        { error: "Time slots are required" },
        { status: 400 }
      );
    }

    // Get booking if it exists
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlots: true,
      },
    });

    // Use booking's time slots and address if not provided
    const slotsToCheck = timeSlots.map((ts: any) => ({
      startAt: new Date(ts.startAt),
      endAt: new Date(ts.endAt),
    }));

    const addressToCheck = address || booking?.address || "";

    const conflicts = await detectBookingConflicts(
      id,
      slotsToCheck,
      addressToCheck,
      sitterId
    );

    return NextResponse.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      conflictCount: conflicts.length,
    });
  } catch (error: any) {
    console.error("Failed to check conflicts:", error);
    return NextResponse.json(
      { error: "Failed to check conflicts" },
      { status: 500 }
    );
  }
}
