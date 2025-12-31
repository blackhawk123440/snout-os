import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/automations/[id]
 * Get a single automation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const automation = await prisma.automation.findUnique({
      where: { id },
      include: {
        conditions: {
          orderBy: { order: "asc" },
        },
        actions: {
          orderBy: { order: "asc" },
        },
        logs: {
          take: 50,
          orderBy: { executedAt: "desc" },
        },
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error("Failed to fetch automation:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/automations/[id]
 * Update an automation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      trigger,
      enabled,
      priority,
      conditions,
      actions,
    } = body;

    // Update automation
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (trigger !== undefined) updateData.trigger = trigger;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (priority !== undefined) updateData.priority = priority;

    // Update conditions if provided
    if (conditions !== undefined) {
      // Delete existing conditions
      await prisma.automationCondition.deleteMany({
        where: { automationId: id },
      });

      // Create new conditions
      if (Array.isArray(conditions) && conditions.length > 0) {
        await prisma.automationCondition.createMany({
          data: conditions.map((c: any, index: number) => ({
            automationId: id,
            field: c.field,
            operator: c.operator,
            value: c.value,
            logic: c.logic,
            order: c.order ?? index,
          })),
        });
      }
    }

    // Update actions if provided
    if (actions !== undefined) {
      // Delete existing actions
      await prisma.automationAction.deleteMany({
        where: { automationId: id },
      });

      // Create new actions
      if (Array.isArray(actions) && actions.length > 0) {
        await prisma.automationAction.createMany({
          data: actions.map((a: any, index: number) => ({
            automationId: id,
            type: a.type,
            config: typeof a.config === "string" ? a.config : JSON.stringify(a.config),
            order: a.order ?? index,
            delayMinutes: a.delayMinutes ?? 0,
          })),
        });
      }
    }

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

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error("Failed to update automation:", error);
    return NextResponse.json(
      { error: "Failed to update automation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automations/[id]
 * Delete an automation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.automation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete automation:", error);
    return NextResponse.json(
      { error: "Failed to delete automation" },
      { status: 500 }
    );
  }
}



