import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/service-configs/[id]
 * Get a single service configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const config = await prisma.serviceConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Service config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("Failed to fetch service config:", error);
    return NextResponse.json(
      { error: "Failed to fetch service config" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/service-configs/[id]
 * Update a service configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};
    if (body.serviceName !== undefined) updateData.serviceName = body.serviceName;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.defaultDuration !== undefined) updateData.defaultDuration = body.defaultDuration;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.minBookingNotice !== undefined) updateData.minBookingNotice = body.minBookingNotice;
    if (body.gpsCheckInRequired !== undefined) updateData.gpsCheckInRequired = body.gpsCheckInRequired;
    if (body.photosRequired !== undefined) updateData.photosRequired = body.photosRequired;
    if (body.allowedSitterTiers !== undefined) {
      updateData.allowedSitterTiers = body.allowedSitterTiers ? JSON.stringify(body.allowedSitterTiers) : null;
    }
    if (body.allowedSitterTypes !== undefined) {
      updateData.allowedSitterTypes = body.allowedSitterTypes ? JSON.stringify(body.allowedSitterTypes) : null;
    }
    if (body.weekendMultiplier !== undefined) updateData.weekendMultiplier = body.weekendMultiplier;
    if (body.holidayMultiplier !== undefined) updateData.holidayMultiplier = body.holidayMultiplier;
    if (body.timeOfDayRules !== undefined) {
      updateData.timeOfDayRules = body.timeOfDayRules ? JSON.stringify(body.timeOfDayRules) : null;
    }
    if (body.holidayBehavior !== undefined) {
      updateData.holidayBehavior = body.holidayBehavior ? JSON.stringify(body.holidayBehavior) : null;
    }
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const config = await prisma.serviceConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("Failed to update service config:", error);
    return NextResponse.json(
      { error: "Failed to update service config" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/service-configs/[id]
 * Delete a service configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.serviceConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete service config:", error);
    return NextResponse.json(
      { error: "Failed to delete service config" },
      { status: 500 }
    );
  }
}


