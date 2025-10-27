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

    // Get bookings for this sitter
    const bookings = await prisma.booking.findMany({
      where: { sitterId: params.id },
      include: {
        pets: true,
      },
      orderBy: {
        startAt: "desc",
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to fetch sitter bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}