import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/custom-fields
 * Get all custom fields
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const where: any = {};
    if (entityType) where.entityType = entityType;

    const fields = await prisma.customField.findMany({
      where,
      orderBy: [
        { entityType: "asc" },
        { order: "asc" },
      ],
    });

    return NextResponse.json({ fields });
  } catch (error: any) {
    console.error("Failed to fetch custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-fields
 * Create a new custom field
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      label,
      fieldType,
      required = false,
      visibleToOwner = true,
      visibleToSitter = false,
      visibleToClient = false,
      editableBySitter = false,
      editableByClient = false,
      showInTemplates = false,
      options,
      defaultValue,
      order = 0,
    } = body;

    if (!entityType || !label || !fieldType) {
      return NextResponse.json(
        { error: "Entity type, label, and field type are required" },
        { status: 400 }
      );
    }

    const field = await prisma.customField.create({
      data: {
        entityType,
        label,
        fieldType,
        required,
        visibleToOwner,
        visibleToSitter,
        visibleToClient,
        editableBySitter,
        editableByClient,
        showInTemplates,
        options: options ? JSON.stringify(options) : null,
        defaultValue,
        order,
      },
    });

    return NextResponse.json({ field });
  } catch (error: any) {
    console.error("Failed to create custom field:", error);
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}

