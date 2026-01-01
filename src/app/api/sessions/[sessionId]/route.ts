/**
 * Individual Session API
 * 
 * Master Spec Reference: Section 12.2.5
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { logEvent } from "@/lib/event-logger";

/**
 * GET /api/sessions/[sessionId]
 * 
 * Get details of a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const currentUser = await getCurrentUserSafe(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify user can view this session
    if (session.userId !== currentUser.id) {
      // TODO: Check if current user has admin/owner role
      return NextResponse.json(
        { error: "Unauthorized: You can only view your own sessions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      session: {
        id: session.id,
        sessionToken: session.sessionToken.substring(0, 8) + "...", // Partial token
        userId: session.userId,
        user: session.user,
        expires: session.expires,
        isExpired: session.expires < new Date(),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * 
 * Revoke a specific session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  let sessionId: string | undefined;
  try {
    const paramsResult = await params;
    sessionId = paramsResult.sessionId;
    const currentUser = await getCurrentUserSafe(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get session to verify ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify user can revoke this session
    if (session.userId !== currentUser.id) {
      // TODO: Check if current user has admin/owner role
      return NextResponse.json(
        { error: "Unauthorized: You can only revoke your own sessions" },
        { status: 403 }
      );
    }

    // Delete session
    await prisma.session.delete({
      where: { id: sessionId },
    });

    // Log audit event
    await logEvent("session.revoked", "success", {
      metadata: {
        message: `Session revoked: ${session.sessionToken.substring(0, 8)}...`,
        sessionId: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        revokedBy: currentUser.id,
        revokedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error: any) {
    console.error("Failed to revoke session:", error);

    // Log audit event for failure
    try {
      await logEvent("session.revoked", "failed", {
        error: error.message || "Unknown error",
        metadata: {
          message: "Failed to revoke session",
          sessionId: sessionId || "unknown",
        },
      });
    } catch (logError) {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}

