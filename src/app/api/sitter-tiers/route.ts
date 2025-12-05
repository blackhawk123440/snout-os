import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/sitter-tiers
 * Get all sitter tiers
 */
export async function GET() {
  try {
    const tiers = await prisma.sitterTier.findMany({
      orderBy: { priorityLevel: "desc" },
      include: {
        _count: {
          select: {
            sitters: true,
          },
        },
      },
    });

    return NextResponse.json({ tiers });
  } catch (error: any) {
    console.error("Failed to fetch sitter tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch sitter tiers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sitter-tiers
 * Create a new sitter tier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      pointTarget,
      minCompletionRate,
      minResponseRate,
      benefits,
      priorityLevel = 0,
      canTakeHouseSits = false,
      canTakeTwentyFourHourCare = false,
      isDefault = false,
    } = body;

    if (!name || pointTarget === undefined) {
      return NextResponse.json(
        { error: "Name and pointTarget are required" },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.sitterTier.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const tier = await prisma.sitterTier.create({
      data: {
        name,
        pointTarget,
        minCompletionRate,
        minResponseRate,
        benefits: benefits ? JSON.stringify(benefits) : null,
        priorityLevel,
        canTakeHouseSits,
        canTakeTwentyFourHourCare,
        isDefault,
      },
    });

    return NextResponse.json({ tier });
  } catch (error: any) {
    console.error("Failed to create sitter tier:", error);
    return NextResponse.json(
      { error: "Failed to create sitter tier" },
      { status: 500 }
    );
  }
}

