import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/templates
 * Get all message templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (category) where.category = category;
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === "true";

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

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
 * POST /api/templates
 * Create a new message template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      category,
      templateKey,
      subject,
      body,
      variables,
      isActive = true,
    } = body;

    if (!name || !type || !category || !templateKey || !body) {
      return NextResponse.json(
        { error: "Name, type, category, templateKey, and body are required" },
        { status: 400 }
      );
    }

    // Check if template key already exists
    const existing = await prisma.messageTemplate.findUnique({
      where: { templateKey },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Template key already exists" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        type,
        category,
        templateKey,
        subject,
        body,
        variables: variables ? JSON.stringify(variables) : null,
        isActive,
        version: 1,
      },
    });

    // Create initial history entry
    await prisma.templateHistory.create({
      data: {
        templateId: template.id,
        subject,
        body,
        version: 1,
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

