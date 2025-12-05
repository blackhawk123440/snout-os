import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/form-fields
 * Get all form fields
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");

    const where: any = { enabled: true };
    if (serviceType) {
      where.OR = [
        { serviceType: null },
        { serviceType },
      ];
    }

    const fields = await prisma.formField.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ fields });
  } catch (error: any) {
    console.error("Failed to fetch form fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch form fields" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/form-fields
 * Create a new form field
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceType,
      label,
      fieldType,
      required = false,
      order = 0,
      options,
      placeholder,
      helpText,
      visibleToSitter = false,
      visibleToClient = true,
      includeInReport = false,
      enabled = true,
    } = body;

    if (!label || !fieldType) {
      return NextResponse.json(
        { error: "Label and field type are required" },
        { status: 400 }
      );
    }

    const field = await prisma.formField.create({
      data: {
        serviceType: serviceType || null,
        label,
        fieldType,
        required,
        order,
        options: options ? JSON.stringify(options) : null,
        placeholder,
        helpText,
        visibleToSitter,
        visibleToClient,
        includeInReport,
        enabled,
      },
    });

    return NextResponse.json({ field });
  } catch (error: any) {
    console.error("Failed to create form field:", error);
    return NextResponse.json(
      { error: "Failed to create form field" },
      { status: 500 }
    );
  }
}

