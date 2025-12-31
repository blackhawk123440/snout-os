import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/pricing-rules
 * Get all pricing rules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get("enabled");
    const type = searchParams.get("type");

    const where: any = {};
    if (enabled !== null) {
      where.enabled = enabled === "true";
    }
    if (type) {
      where.type = type;
    }

    const rules = await prisma.pricingRule.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error("Failed to fetch pricing rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing rules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pricing-rules
 * Create a new pricing rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      conditions,
      calculation,
      priority = 0,
      enabled = true,
    } = body;

    if (!name || !type || !conditions || !calculation) {
      return NextResponse.json(
        { error: "Name, type, conditions, and calculation are required" },
        { status: 400 }
      );
    }

    const rule = await prisma.pricingRule.create({
      data: {
        name,
        description,
        type,
        conditions: typeof conditions === "string" ? conditions : JSON.stringify(conditions),
        calculation: typeof calculation === "string" ? calculation : JSON.stringify(calculation),
        priority,
        enabled,
      },
    });

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Failed to create pricing rule:", error);
    return NextResponse.json(
      { error: "Failed to create pricing rule" },
      { status: 500 }
    );
  }
}



