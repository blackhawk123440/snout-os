import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSitterRecommendations } from "@/lib/booking-engine";

/**
 * POST /api/bookings/[id]/recommend-sitters
 * Get sitter recommendations for a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { timeSlots, address, service, petCount } = body;

    // Get booking if it exists
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlots: {
          orderBy: { startAt: "asc" },
        },
        pets: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Use provided data or booking data
    const slotsToUse = timeSlots || booking.timeSlots.map(ts => ({
      startAt: ts.startAt,
      endAt: ts.endAt,
    }));

    const addressToUse = address || booking.address || "";
    const serviceToUse = service || booking.service;
    const petCountToUse = petCount || booking.pets.length;

    if (!slotsToUse || slotsToUse.length === 0) {
      return NextResponse.json(
        { error: "Time slots are required" },
        { status: 400 }
      );
    }

    const recommendations = await getSitterRecommendations(
      id,
      serviceToUse,
      slotsToUse,
      addressToUse,
      petCountToUse
    );

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error("Failed to get sitter recommendations:", error);
    return NextResponse.json(
      { error: "Failed to get sitter recommendations" },
      { status: 500 }
    );
  }
}

