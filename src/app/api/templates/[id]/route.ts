import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/templates/[id]
 * Get a single template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const template = await prisma.messageTemplate.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { changedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
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

/**
 * PATCH /api/templates/[id]
 * Update a template (creates new version)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, subject, body: templateBody, variables, isActive } = body;

    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const newVersion = existing.version + 1;

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        subject: subject !== undefined ? subject : existing.subject,
        body: templateBody !== undefined ? templateBody : existing.body,
        variables: variables !== undefined ? JSON.stringify(variables) : existing.variables,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        version: newVersion,
      },
    });

    // Create history entry
    await prisma.templateHistory.create({
      data: {
        templateId: id,
        subject: template.subject,
        body: template.body,
        version: newVersion,
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.messageTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}


