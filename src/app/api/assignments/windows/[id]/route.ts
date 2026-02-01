/**
 * Assignment Window Operations
 * 
 * PATCH /api/assignments/windows/[id] - Update window
 * DELETE /api/assignments/windows/[id] - Delete window
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function PATCH(
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

    const { startsAt, endsAt, sitterId, bookingRef } = body;

    // Find window
    const window = await prisma.assignmentWindow.findFirst({
      where: { id, thread: { orgId } },
    });

    if (!window) {
      return NextResponse.json(
        { error: "Assignment window not found" },
        { status: 404 }
      );
    }

    // Update window
    const updateData: any = {};
    if (startsAt) updateData.startAt = new Date(startsAt);
    if (endsAt) updateData.endAt = new Date(endsAt);
    if (sitterId) updateData.sitterId = sitterId;
    if (bookingRef !== undefined) updateData.bookingRef = bookingRef || null;

    const updated = await prisma.assignmentWindow.update({
      where: { id },
      data: updateData,
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
    });

    const now = new Date();
    let status: 'active' | 'future' | 'past' = 'past';
    if (updated.startAt <= now && updated.endAt >= now) {
      status = 'active';
    } else if (updated.startAt > now) {
      status = 'future';
    }

    return NextResponse.json({
      id: updated.id,
      threadId: updated.threadId,
      sitterId: updated.sitterId,
      startsAt: updated.startAt.toISOString(),
      endsAt: updated.endAt.toISOString(),
      bookingRef: updated.bookingRef,
      status,
      thread: {
        id: updated.thread.id,
        client: {
          id: updated.thread.client.id,
          name: `${updated.thread.client.firstName} ${updated.thread.client.lastName}`,
        },
      },
      sitter: {
        id: updated.sitter.id,
        name: `${updated.sitter.firstName} ${updated.sitter.lastName}`,
      },
    });
  } catch (error: any) {
    console.error("[assignments/windows/[id]] PATCH Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Find window
    const window = await prisma.assignmentWindow.findFirst({
      where: { id, thread: { orgId } },
    });

    if (!window) {
      return NextResponse.json(
        { error: "Assignment window not found" },
        { status: 404 }
      );
    }

    // Check if active
    const now = new Date();
    const isActive = window.startAt <= now && window.endAt >= now;

    // Delete window
    await prisma.assignmentWindow.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      wasActive: isActive,
      message: isActive 
        ? "Active window deleted. Messages will now route to owner inbox."
        : "Window deleted.",
    });
  } catch (error: any) {
    console.error("[assignments/windows/[id]] DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
