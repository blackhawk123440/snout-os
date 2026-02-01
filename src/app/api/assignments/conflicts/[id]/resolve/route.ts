/**
 * Resolve Assignment Conflict
 * POST /api/assignments/conflicts/[id]/resolve
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
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
    const { id: conflictId } = await params;
    const body = await request.json();

    const { strategy } = body;

    if (!strategy || !['keepA', 'keepB', 'split'].includes(strategy)) {
      return NextResponse.json(
        { error: "Invalid strategy. Must be keepA, keepB, or split" },
        { status: 400 }
      );
    }

    // Parse conflict ID (format: windowAId-windowBId)
    const [windowAId, windowBId] = conflictId.split('-');
    if (!windowAId || !windowBId) {
      return NextResponse.json(
        { error: "Invalid conflict ID format" },
        { status: 400 }
      );
    }

    // Find both windows
    const windowA = await prisma.assignmentWindow.findFirst({
      where: { id: windowAId, thread: { orgId } },
    });

    const windowB = await prisma.assignmentWindow.findFirst({
      where: { id: windowBId, thread: { orgId } },
    });

    if (!windowA || !windowB) {
      return NextResponse.json(
        { error: "One or both windows not found" },
        { status: 404 }
      );
    }

    // Resolve conflict based on strategy
    if (strategy === 'keepA') {
      // Delete window B
      await prisma.assignmentWindow.delete({
        where: { id: windowBId },
      });
    } else if (strategy === 'keepB') {
      // Delete window A
      await prisma.assignmentWindow.delete({
        where: { id: windowAId },
      });
    } else if (strategy === 'split') {
      // Adjust windows to remove overlap
      // Find overlap period
      const overlapStart = windowA.startAt > windowB.startAt ? windowA.startAt : windowB.startAt;
      const overlapEnd = windowA.endAt < windowB.endAt ? windowA.endAt : windowB.endAt;
      const overlapMid = new Date((overlapStart.getTime() + overlapEnd.getTime()) / 2);

      // Split: window A ends at overlap mid, window B starts at overlap mid
      await prisma.assignmentWindow.update({
        where: { id: windowAId },
        data: { endAt: overlapMid },
      });

      await prisma.assignmentWindow.update({
        where: { id: windowBId },
        data: { startAt: overlapMid },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Conflict resolved using strategy: ${strategy}`,
    });
  } catch (error: any) {
    console.error("[assignments/conflicts/resolve] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
