import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/sitter-tiers/[id]
 * Get a single sitter tier
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tier = await prisma.sitterTier.findUnique({
      where: { id },
      include: {
        sitters: {
          include: {
            sitter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!tier) {
      return NextResponse.json(
        { error: "Sitter tier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tier });
  } catch (error: any) {
    console.error("Failed to fetch sitter tier:", error);
    return NextResponse.json(
      { error: "Failed to fetch sitter tier" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sitter-tiers/[id]
 * Update a sitter tier
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
    if (body.pointTarget !== undefined) updateData.pointTarget = body.pointTarget;
    if (body.minCompletionRate !== undefined) updateData.minCompletionRate = body.minCompletionRate;
    if (body.minResponseRate !== undefined) updateData.minResponseRate = body.minResponseRate;
    if (body.benefits !== undefined) {
      updateData.benefits = body.benefits ? JSON.stringify(body.benefits) : null;
    }
    if (body.priorityLevel !== undefined) updateData.priorityLevel = body.priorityLevel;
    if (body.canTakeHouseSits !== undefined) updateData.canTakeHouseSits = body.canTakeHouseSits;
    if (body.canTakeTwentyFourHourCare !== undefined) {
      updateData.canTakeTwentyFourHourCare = body.canTakeTwentyFourHourCare;
    }
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault;
      // If setting as default, unset other defaults
      if (body.isDefault) {
        await prisma.sitterTier.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }

    const tier = await prisma.sitterTier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ tier });
  } catch (error: any) {
    console.error("Failed to update sitter tier:", error);
    return NextResponse.json(
      { error: "Failed to update sitter tier" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sitter-tiers/[id]
 * Delete a sitter tier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tier = await prisma.sitterTier.findUnique({
      where: { id },
    });

    if (!tier) {
      return NextResponse.json(
        { error: "Sitter tier not found" },
        { status: 404 }
      );
    }

    if (tier.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default tier" },
        { status: 400 }
      );
    }

    await prisma.sitterTier.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete sitter tier:", error);
    return NextResponse.json(
      { error: "Failed to delete sitter tier" },
      { status: 500 }
    );
  }
}


