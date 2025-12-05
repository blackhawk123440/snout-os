import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/automations
 * Get all automations
 */
export async function GET() {
  try {
    const automations = await prisma.automation.findMany({
      include: {
        conditions: {
          orderBy: { order: "asc" },
        },
        actions: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            logs: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ automations });
  } catch (error: any) {
    console.error("Failed to fetch automations:", error);
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations
 * Create a new automation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      trigger,
      enabled = true,
      priority = 0,
      conditions = [],
      actions = [],
    } = body;

    if (!name || !trigger) {
      return NextResponse.json(
        { error: "Name and trigger are required" },
        { status: 400 }
      );
    }

    const automation = await prisma.automation.create({
      data: {
        name,
        description,
        trigger,
        enabled,
        priority,
        conditions: {
          create: conditions.map((c: any, index: number) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            logic: c.logic,
            order: c.order ?? index,
          })),
        },
        actions: {
          create: actions.map((a: any, index: number) => ({
            type: a.type,
            config: typeof a.config === "string" ? a.config : JSON.stringify(a.config),
            order: a.order ?? index,
            delayMinutes: a.delayMinutes ?? 0,
          })),
        },
      },
      include: {
        conditions: true,
        actions: true,
      },
    });

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error("Failed to create automation:", error);
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    );
  }
}

