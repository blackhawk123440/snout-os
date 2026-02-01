/**
 * Assignment Conflicts
 * GET /api/assignments/conflicts
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
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

    // Get all active and future windows
    const now = new Date();
    const windows = await prisma.assignmentWindow.findMany({
      where: {
        thread: { orgId },
        OR: [
          { startAt: { gte: now } }, // Future
          { 
            AND: [
              { startAt: { lte: now } },
              { endAt: { gte: now } },
            ],
          }, // Active
        ],
      },
      include: {
        thread: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        sitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    // Find overlapping windows for the same thread
    const conflicts = [];
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const w1 = windows[i];
        const w2 = windows[j];

        // Check if same thread and overlapping
        if (w1.threadId === w2.threadId) {
          const overlapStart = w1.startAt > w2.startAt ? w1.startAt : w2.startAt;
          const overlapEnd = w1.endAt < w2.endAt ? w1.endAt : w2.endAt;

          if (overlapStart < overlapEnd) {
            conflicts.push({
              conflictId: `${w1.id}-${w2.id}`,
              windowA: {
                id: w1.id,
                threadId: w1.threadId,
                sitterId: w1.sitterId,
                sitter: {
                  id: w1.sitter.id,
                  name: `${w1.sitter.firstName} ${w1.sitter.lastName}`,
                },
                startsAt: w1.startAt.toISOString(),
                endsAt: w1.endAt.toISOString(),
              },
              windowB: {
                id: w2.id,
                threadId: w2.threadId,
                sitterId: w2.sitterId,
                sitter: {
                  id: w2.sitter.id,
                  name: `${w2.sitter.firstName} ${w2.sitter.lastName}`,
                },
                startsAt: w2.startAt.toISOString(),
                endsAt: w2.endAt.toISOString(),
              },
              thread: {
                id: w1.thread.id,
                client: {
                  id: w1.thread.client.id,
                  name: `${w1.thread.client.firstName} ${w1.thread.client.lastName}`,
                },
              },
              overlapStart: overlapStart.toISOString(),
              overlapEnd: overlapEnd.toISOString(),
            });
          }
        }
      }
    }

    return NextResponse.json(conflicts);
  } catch (error: any) {
    console.error("[assignments/conflicts] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
