import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/pricing-rules/[id]
 * Get a single pricing rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const rule = await prisma.pricingRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Pricing rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Failed to fetch pricing rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing rule" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pricing-rules/[id]
 * Update a pricing rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.conditions !== undefined) {
      updateData.conditions = typeof body.conditions === "string" 
        ? body.conditions 
        : JSON.stringify(body.conditions);
    }
    if (body.calculation !== undefined) {
      updateData.calculation = typeof body.calculation === "string"
        ? body.calculation
        : JSON.stringify(body.calculation);
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const rule = await prisma.pricingRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Failed to update pricing rule:", error);
    return NextResponse.json(
      { error: "Failed to update pricing rule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pricing-rules/[id]
 * Delete a pricing rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.pricingRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete pricing rule:", error);
    return NextResponse.json(
      { error: "Failed to delete pricing rule" },
      { status: 500 }
    );
  }
}

