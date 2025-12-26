import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processAutomations } from "@/lib/automation-engine";

/**
 * POST /api/automations/[id]/run
 * Manually trigger an automation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { context = {} } = body;

    const automation = await prisma.automation.findUnique({
      where: { id },
      include: {
        conditions: {
          orderBy: { order: "asc" },
        },
        actions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    // Process this specific automation
    await processAutomations(automation.trigger, {
      ...context,
      manualTrigger: true,
      automationId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to run automation:", error);
    return NextResponse.json(
      { error: "Failed to run automation" },
      { status: 500 }
    );
  }
}


