/**
 * Release Number from Quarantine
 * POST /api/numbers/[id]/release
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

    if (number.status !== 'quarantined') {
      return NextResponse.json(
        { error: "Number is not quarantined" },
        { status: 400 }
      );
    }

    // Check cooldown period (if quarantineReleaseAt field exists in schema)
    // Note: Root schema may not have quarantineReleaseAt field
    const quarantineReleaseAt = (number as any).quarantineReleaseAt;
    if (quarantineReleaseAt && new Date() < new Date(quarantineReleaseAt)) {
      const daysRemaining = Math.ceil(
        (new Date(quarantineReleaseAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return NextResponse.json(
        { 
          error: "Cooldown period not expired",
          daysRemaining,
          releaseAt: quarantineReleaseAt,
        },
        { status: 400 }
      );
    }

    // Release from quarantine
    await prisma.messageNumber.update({
      where: { id },
      data: {
        status: 'active',
        // Note: Root schema may not have quarantine fields
      },
    });

    return NextResponse.json({
      success: true,
      message: "Number released from quarantine",
    });
  } catch (error: any) {
    console.error("[numbers/release] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
