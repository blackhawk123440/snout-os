import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/booking-pipeline/[id]
 * Update a pipeline stage
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
    if (body.order !== undefined) updateData.order = body.order;
    if (body.transitions !== undefined) {
      updateData.transitions = body.transitions ? JSON.stringify(body.transitions) : null;
    }
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault;
      // If setting as default, unset other defaults
      if (body.isDefault) {
        await prisma.bookingPipeline.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }

    const stage = await prisma.bookingPipeline.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ stage });
  } catch (error: any) {
    console.error("Failed to update pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline stage" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/booking-pipeline/[id]
 * Delete a pipeline stage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.bookingPipeline.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline stage" },
      { status: 500 }
    );
  }
}


