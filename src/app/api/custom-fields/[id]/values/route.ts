import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/custom-fields/[id]/values
 * Get all values for a custom field
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entityId");

    const where: any = { customFieldId: id };
    if (entityId) {
      where.entityId = entityId;
    }

    const values = await prisma.customFieldValue.findMany({
      where,
      include: {
        customField: true,
      },
    });

    return NextResponse.json({ values });
  } catch (error: any) {
    console.error("Failed to fetch custom field values:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field values" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-fields/[id]/values
 * Set a custom field value for an entity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entityId, value, petId, sitterId, clientId, bookingId } = body;

    if (!entityId || value === undefined) {
      return NextResponse.json(
        { error: "entityId and value are required" },
        { status: 400 }
      );
    }

    // Get custom field to determine entity type
    const customField = await prisma.customField.findUnique({
      where: { id },
    });

    if (!customField) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      );
    }

    const valueData: any = {
      customFieldId: id,
      entityId,
      value: String(value),
    };

    // Set appropriate relation based on entity type
    if (customField.entityType === "pet" && petId) {
      valueData.petId = petId;
    } else if (customField.entityType === "sitter" && sitterId) {
      valueData.sitterId = sitterId;
    } else if (customField.entityType === "client" && clientId) {
      valueData.clientId = clientId;
    } else if (customField.entityType === "booking" && bookingId) {
      valueData.bookingId = bookingId;
    }

    const fieldValue = await prisma.customFieldValue.upsert({
      where: {
        customFieldId_entityId: {
          customFieldId: id,
          entityId,
        },
      },
      update: {
        value: String(value),
      },
      create: valueData,
    });

    return NextResponse.json({ value: fieldValue });
  } catch (error: any) {
    console.error("Failed to set custom field value:", error);
    return NextResponse.json(
      { error: "Failed to set custom field value" },
      { status: 500 }
    );
  }
}

