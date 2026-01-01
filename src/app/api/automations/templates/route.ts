/**
 * Automation Templates API
 * 
 * Master Spec Reference: Section 6.3, Epic 12.3.4
 * 
 * API endpoints for automation templates library - "plug and play" UX
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllTemplates, getTemplateById, getTemplatesByCategory } from "@/lib/automation-templates";
import { prisma } from "@/lib/db";

/**
 * GET /api/automations/templates
 * 
 * List all available automation templates
 * Optional query params:
 * - category: Filter by category (booking, payment, reminder, notification, review)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as "booking" | "payment" | "reminder" | "notification" | "review" | null;

    let templates;
    if (category) {
      templates = getTemplatesByCategory(category);
    } else {
      templates = getAllTemplates();
    }

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations/templates
 * 
 * Instantiate a template as a new automation
 * Body: { templateId: string, name?: string, enabled?: boolean, customizations?: Record<string, any> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, name, enabled = true, customizations = {} } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    // Get template
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    // Use custom name or template name
    const automationName = name || template.name;

    // Create automation from template
    const automation = await prisma.automation.create({
      data: {
        name: automationName,
        description: template.description,
        trigger: template.trigger,
        enabled: enabled !== undefined ? enabled : template.defaultEnabled,
        priority: 0,
        conditions: {
          create: template.conditions.map((cond, index) => ({
            field: cond.field,
            operator: cond.operator,
            value: cond.value,
            logic: cond.logic || null,
            order: index,
          })),
        },
        actions: {
          create: template.actions.map((action, index) => ({
            type: action.type,
            config: JSON.stringify({
              ...action.config,
              ...(customizations[action.type] || {}),
            }),
            order: index,
            delayMinutes: action.delayMinutes || 0,
          })),
        },
      },
      include: {
        conditions: true,
        actions: true,
      },
    });

    return NextResponse.json({
      success: true,
      automation,
      message: `Automation "${automationName}" created from template "${template.name}"`,
    });
  } catch (error: any) {
    console.error("Failed to instantiate template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to instantiate template" },
      { status: 500 }
    );
  }
}

