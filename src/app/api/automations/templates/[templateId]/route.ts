/**
 * Automation Template by ID API
 * 
 * Master Spec Reference: Section 6.3, Epic 12.3.4
 */

import { NextRequest, NextResponse } from "next/server";
import { getTemplateById } from "@/lib/automation-templates";

/**
 * GET /api/automations/templates/[templateId]
 * 
 * Get a specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

