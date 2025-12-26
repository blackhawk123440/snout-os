import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/discounts
 * Get all discounts
 */
export async function GET() {
  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ discounts });
  } catch (error: any) {
    console.error("Failed to fetch discounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discounts
 * Create a new discount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      type,
      value,
      valueType,
      minBookingTotal,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      conditions,
      enabled = true,
    } = body;

    if (!name || !type || value === undefined || !valueType) {
      return NextResponse.json(
        { error: "Name, type, value, and valueType are required" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        code: code || null,
        name,
        type,
        value,
        valueType,
        minBookingTotal,
        maxDiscount,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        usageLimit,
        conditions: conditions ? JSON.stringify(conditions) : null,
        enabled,
      },
    });

    return NextResponse.json({ discount });
  } catch (error: any) {
    console.error("Failed to create discount:", error);
    return NextResponse.json(
      { error: "Failed to create discount" },
      { status: 500 }
    );
  }
}


