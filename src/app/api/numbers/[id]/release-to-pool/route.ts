/**
 * Release Sitter Number to Pool
 * POST /api/numbers/[id]/release-to-pool
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
      include: {
        threads: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    if (!number) {
      return NextResponse.json(
        { error: "Number not found" },
        { status: 404 }
      );
    }

    if (number.numberClass !== 'sitter') {
      return NextResponse.json(
        { error: "Only sitter numbers can be released to pool" },
        { status: 400 }
      );
    }

    // Impact preview
    const affectedThreads = number.threads.length;

    // Release to pool (change class and remove sitter assignment)
    await prisma.messageNumber.update({
      where: { id },
      data: {
        numberClass: 'pool',
        assignedSitterId: null,
      },
    });

    return NextResponse.json({
      success: true,
      impact: {
        affectedThreads,
        message: affectedThreads > 0 
          ? `${affectedThreads} active thread(s) will continue using this number as a pool number.`
          : "Number released to pool.",
      },
    });
  } catch (error: any) {
    console.error("[numbers/release-to-pool] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
