import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/service-configs
 * Get all service configurations
 */
export async function GET() {
  try {
    const configs = await prisma.serviceConfig.findMany({
      orderBy: { serviceName: "asc" },
    });

    return NextResponse.json({ configs });
  } catch (error: any) {
    console.error("Failed to fetch service configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch service configs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/service-configs
 * Create a new service configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceName,
      basePrice,
      defaultDuration,
      category,
      minBookingNotice,
      gpsCheckInRequired = false,
      photosRequired = false,
      allowedSitterTiers,
      allowedSitterTypes,
      weekendMultiplier = 1.0,
      holidayMultiplier = 1.0,
      timeOfDayRules,
      holidayBehavior,
      enabled = true,
    } = body;

    if (!serviceName) {
      return NextResponse.json(
        { error: "Service name is required" },
        { status: 400 }
      );
    }

    const config = await prisma.serviceConfig.create({
      data: {
        serviceName,
        basePrice,
        defaultDuration,
        category,
        minBookingNotice,
        gpsCheckInRequired,
        photosRequired,
        allowedSitterTiers: allowedSitterTiers ? JSON.stringify(allowedSitterTiers) : null,
        allowedSitterTypes: allowedSitterTypes ? JSON.stringify(allowedSitterTypes) : null,
        weekendMultiplier,
        holidayMultiplier,
        timeOfDayRules: timeOfDayRules ? JSON.stringify(timeOfDayRules) : null,
        holidayBehavior: holidayBehavior ? JSON.stringify(holidayBehavior) : null,
        enabled,
      },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("Failed to create service config:", error);
    return NextResponse.json(
      { error: "Failed to create service config" },
      { status: 500 }
    );
  }
}

