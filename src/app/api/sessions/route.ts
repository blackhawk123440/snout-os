/**
 * Sessions API
 * 
 * Master Spec Reference: Section 12.2.5
 * 
 * Session inventory and management endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe, requireSession } from "@/lib/auth-helpers";
import { logEvent } from "@/lib/event-logger";

/**
 * GET /api/sessions
 * 
 * Get session inventory for a user or all users (admin only)
 * Query params:
 * - userId: Filter by user ID (optional, admin only)
 * - includeExpired: Include expired sessions (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user to check permissions
    const currentUser = await getCurrentUserSafe(request);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const includeExpired = searchParams.get("includeExpired") === "true";

    // Build where clause
    const where: any = {};
    
    if (userId) {
      // Only allow filtering by userId if current user is admin/owner or filtering their own sessions
      if (currentUser && (currentUser.id === userId)) {
        where.userId = userId;
      } else {
        // TODO: Check if current user has admin/owner role for viewing other users' sessions
        // For now, only allow viewing own sessions
        return NextResponse.json(
          { error: "Unauthorized: You can only view your own sessions" },
          { status: 403 }
        );
      }
    } else if (currentUser) {
      // If no userId specified, return current user's sessions
      where.userId = currentUser.id;
    } else {
      // No user logged in
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Filter expired sessions if not including them
    if (!includeExpired) {
      where.expires = {
        gt: new Date(),
      };
    }

    // Fetch sessions with user information
    const sessions = await prisma.session.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        expires: "desc",
      },
    });

    // Format response
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      sessionToken: session.sessionToken.substring(0, 8) + "...", // Partial token for display
      userId: session.userId,
      user: session.user,
      expires: session.expires,
      isExpired: session.expires < new Date(),
      createdAt: (session as any).createdAt || null, // Note: createdAt not in schema, but may exist
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      count: formattedSessions.length,
      activeCount: formattedSessions.filter((s) => !s.isExpired).length,
    });
  } catch (error: any) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * 
 * Revoke a session by session ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
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

    // Verify user can revoke this session (own session or admin)
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

