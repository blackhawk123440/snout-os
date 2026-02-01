/**
 * Assign Number to Sitter
 * POST /api/numbers/[id]/assign
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);
    const { id } = await params;
    const body = await request.json();

    const { sitterId } = body;

    if (!sitterId) {
      return NextResponse.json(
        { error: "sitterId is required" },
        { status: 400 }
      );
    }

    // Find number
    const number = await prisma.messageNumber.findFirst({
      where: { id, orgId },
    });

    if (!number) {
      return NextResponse.json(
        { error: "Number not found" },
        { status: 404 }
      );
    }

    if (number.numberClass !== 'sitter') {
      return NextResponse.json(
        { error: "Only sitter numbers can be assigned to sitters" },
        { status: 400 }
      );
    }

    // Verify sitter exists
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: "Sitter not found" },
        { status: 404 }
      );
    }

    // Check if sitter already has a number assigned
    const existingAssignment = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        assignedSitterId: sitterId,
        numberClass: 'sitter',
        status: 'active',
        id: { not: id },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { 
          error: "Sitter already has a number assigned",
          existingNumberId: existingAssignment.id,
          existingNumberE164: existingAssignment.e164,
        },
        { status: 409 }
      );
    }

    // Assign number to sitter
    await prisma.messageNumber.update({
      where: { id },
      data: {
        assignedSitterId: sitterId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Number assigned to sitter",
    });
  } catch (error: any) {
    console.error("[numbers/assign] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
