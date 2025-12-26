import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/service-point-weights
 * Get all service point weights
 */
export async function GET() {
  try {
    const weights = await prisma.servicePointWeight.findMany({
      orderBy: [
        { service: "asc" },
        { duration: "asc" },
      ],
    });

    return NextResponse.json({ weights });
  } catch (error: any) {
    console.error("Failed to fetch service point weights:", error);
    return NextResponse.json(
      { error: "Failed to fetch service point weights" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/service-point-weights
 * Create or update a service point weight
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, duration, points } = body;

    if (!service || points === undefined) {
      return NextResponse.json(
        { error: "Service and points are required" },
        { status: 400 }
      );
    }

    const weight = await prisma.servicePointWeight.upsert({
      where: {
        service_duration: {
          service,
          duration: duration || null,
        },
      },
      update: {
        points,
      },
      create: {
        service,
        duration: duration || null,
        points,
      },
    });

    return NextResponse.json({ weight });
  } catch (error: any) {
    console.error("Failed to create/update service point weight:", error);
    return NextResponse.json(
      { error: "Failed to create/update service point weight" },
      { status: 500 }
    );
  }
}


