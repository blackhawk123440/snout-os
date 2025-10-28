import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { calculateBookingPrice } from "@/lib/rates";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, startAt, endAt, petCount, quantity = 1, afterHours = false } = body;

    if (!service || !startAt || !endAt || !petCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await calculateBookingPrice(
      service,
      new Date(startAt),
      new Date(endAt),
      petCount,
      quantity,
      afterHours
    );

    return NextResponse.json({ 
      price: result.total,
      notes: result.notes,
      holidayApplied: result.holidayApplied
    });
  } catch (error) {
    console.error("Failed to calculate price:", error);
    return NextResponse.json(
      { error: "Failed to calculate price" },
      { status: 500 }
    );
  }
}