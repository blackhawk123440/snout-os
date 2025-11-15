import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sitter = await prisma.sitter.findUnique({
      where: { id },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Get bookings for this sitter
    const bookings = await prisma.booking.findMany({
      where: { sitterId: id },
      include: {
        pets: true,
      },
      orderBy: {
        startAt: "desc",
      },
    });

    return NextResponse.json({ 
      bookings,
      sitter: {
        id: sitter.id,
        firstName: sitter.firstName,
        lastName: sitter.lastName,
        commissionPercentage: sitter.commissionPercentage || 80.0,
      }
    });
  } catch (error) {
    console.error("Failed to fetch sitter bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}