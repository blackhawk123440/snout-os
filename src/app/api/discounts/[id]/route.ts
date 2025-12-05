import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/discounts/[id]
 * Get a single discount
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        bookings: {
          take: 10,
          orderBy: { usedAt: "desc" },
          include: {
            booking: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                totalPrice: true,
              },
            },
          },
        },
      },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error: any) {
    console.error("Failed to fetch discount:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/discounts/[id]
 * Update a discount
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};
    if (body.code !== undefined) updateData.code = body.code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.valueType !== undefined) updateData.valueType = body.valueType;
    if (body.minBookingTotal !== undefined) updateData.minBookingTotal = body.minBookingTotal;
    if (body.maxDiscount !== undefined) updateData.maxDiscount = body.maxDiscount;
    if (body.validFrom !== undefined) updateData.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit;
    if (body.conditions !== undefined) {
      updateData.conditions = body.conditions ? JSON.stringify(body.conditions) : null;
    }
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const discount = await prisma.discount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ discount });
  } catch (error: any) {
    console.error("Failed to update discount:", error);
    return NextResponse.json(
      { error: "Failed to update discount" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/discounts/[id]
 * Delete a discount
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.discount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete discount:", error);
    return NextResponse.json(
      { error: "Failed to delete discount" },
      { status: 500 }
    );
  }
}

