import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/booking-tags
 * Get all booking tags
 */
export async function GET() {
  try {
    const tags = await prisma.bookingTag.findMany({
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error("Failed to fetch booking tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking tags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/booking-tags
 * Create a new booking tag
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const tag = await prisma.bookingTag.create({
      data: {
        name,
        color: color || null,
      },
    });

    return NextResponse.json({ tag });
  } catch (error: any) {
    console.error("Failed to create booking tag:", error);
    return NextResponse.json(
      { error: "Failed to create booking tag" },
      { status: 500 }
    );
  }
}



