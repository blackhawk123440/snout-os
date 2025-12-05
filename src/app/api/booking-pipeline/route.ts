import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/booking-pipeline
 * Get booking pipeline configuration
 */
export async function GET() {
  try {
    const pipeline = await prisma.bookingPipeline.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ pipeline });
  } catch (error: any) {
    console.error("Failed to fetch booking pipeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking pipeline" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/booking-pipeline
 * Create a new pipeline stage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, order, isDefault, transitions } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.bookingPipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const stage = await prisma.bookingPipeline.create({
      data: {
        name,
        order: order ?? 0,
        isDefault: isDefault ?? false,
        transitions: transitions ? JSON.stringify(transitions) : null,
      },
    });

    return NextResponse.json({ stage });
  } catch (error: any) {
    console.error("Failed to create pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to create pipeline stage" },
      { status: 500 }
    );
  }
}

