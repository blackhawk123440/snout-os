import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // For demo mode, show all confirmed bookings
    // In production, filter by sitterId
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { sitterId: id },
          { sitterId: null, status: "Confirmed" }, // Unassigned confirmed bookings
        ],
        startAt: {
          gte: new Date(), // Only future bookings
        },
      },
      include: {
        pets: true,
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch sitter bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

