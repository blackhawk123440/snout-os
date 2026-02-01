/**
 * Quarantine Number
 * POST /api/numbers/[id]/quarantine
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

    const { reason, reasonDetail } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Quarantine reason is required" },
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

    // Find threads using this number
    const affectedThreads = await prisma.messageThread.count({
      where: {
        orgId,
        messageNumberId: id,
        status: { not: 'archived' },
      },
    });

    // Guardrail: Cannot quarantine last front desk number
    if (number.numberClass === 'front_desk') {
      const frontDeskCount = await prisma.messageNumber.count({
        where: { orgId, numberClass: 'front_desk', status: 'active' },
      });

      if (frontDeskCount <= 1) {
        return NextResponse.json(
          { 
            error: "Cannot quarantine last front desk number",
            impact: {
              affectedThreads,
              message: "This is the only active front desk number. Please add another front desk number before quarantining this one.",
            },
          },
          { status: 400 }
        );
      }
    }
    const cooldownDays = 90; // Default cooldown period
    const releaseAt = new Date();
    releaseAt.setDate(releaseAt.getDate() + cooldownDays);

    // Update number status
    await prisma.messageNumber.update({
      where: { id },
      data: {
        status: 'quarantined',
        quarantinedReason: reason,
        quarantinedReasonDetail: reasonDetail || null,
        quarantineReleaseAt: releaseAt,
      },
    });

    // Impact preview
    const impact = {
      affectedThreads,
      cooldownDays,
      releaseAt: releaseAt.toISOString(),
      message: affectedThreads > 0 
        ? `${affectedThreads} active thread(s) will need new number assignments.`
        : "No active threads affected.",
    };

    return NextResponse.json({
      success: true,
      impact,
    });
  } catch (error: any) {
    console.error("[numbers/quarantine] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
