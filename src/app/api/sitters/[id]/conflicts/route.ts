import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sitter = await prisma.sitter.findUnique({
      where: { id: params.id },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Get all bookings to check for conflicts
    const allBookings = await prisma.booking.findMany({
      where: {
        sitterId: params.id,
        status: {
          in: ["confirmed", "pending"],
        },
      },
      include: {
        pets: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    // Check for time conflicts
    const conflicts = [];
    for (let i = 0; i < allBookings.length; i++) {
      for (let j = i + 1; j < allBookings.length; j++) {
        const booking1 = allBookings[i];
        const booking2 = allBookings[j];
        
        if (
          booking1.startAt < booking2.endAt &&
          booking2.startAt < booking1.endAt
        ) {
          conflicts.push({
            booking1: {
              id: booking1.id,
              startAt: booking1.startAt,
              endAt: booking1.endAt,
              service: booking1.service,
            },
            booking2: {
              id: booking2.id,
              startAt: booking2.startAt,
              endAt: booking2.endAt,
              service: booking2.service,
            },
          });
        }
      }
    }

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error("Failed to fetch sitter conflicts:", error);
    return NextResponse.json({ error: "Failed to fetch conflicts" }, { status: 500 });
  }
}