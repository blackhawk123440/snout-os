/**
 * Session Audit Reporting API
 * 
 * Master Spec Reference: Section 12.2.5
 * 
 * Provides audit logs for session-related events
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";

/**
 * GET /api/sessions/audit
 * 
 * Get audit logs for session operations
 * Query params:
 * - userId: Filter by user ID (optional)
 * - eventType: Filter by event type (optional, e.g., "session.revoked")
 * - status: Filter by status (optional, "success" or "failed")
 * - limit: Limit results (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const eventType = searchParams.get("eventType") || "session.revoked";
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    // Note: Prisma JSON filtering is complex, so we'll filter after fetching
    const where: any = {
      eventType: eventType,
    };

    if (status) {
      where.status = status;
    }

    // Fetch audit logs from EventLog
    const allLogs = await prisma.eventLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        eventType: true,
        status: true,
        metadata: true,
        error: true,
        createdAt: true,
      },
    });

    // Filter by userId if specified (client-side filtering due to Prisma JSON limitations)
    let filteredLogs = allLogs;
    if (userId) {
      // Verify user can view audit logs for this user (own logs or admin)
      if (currentUser.id !== userId) {
        // TODO: Check if current user has admin/owner role
        return NextResponse.json(
          { error: "Unauthorized: You can only view your own audit logs" },
          { status: 403 }
        );
      }
      
      filteredLogs = allLogs.filter((log) => {
        const metadata = log.metadata ? (typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : {};
        return metadata.userId === userId || metadata.revokedBy === userId;
      });
    } else {
      // Filter to current user's audit logs
      filteredLogs = allLogs.filter((log) => {
        const metadata = log.metadata ? (typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : {};
        return metadata.userId === currentUser.id || metadata.revokedBy === currentUser.id;
      });
    }

    // Apply pagination
    const totalCount = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Format response
    const formattedLogs = paginatedLogs.map((log) => {
      const metadata = log.metadata ? (typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : {};
      
      return {
        id: log.id,
        eventType: log.eventType,
        status: log.status,
        message: metadata.message || null,
        error: log.error,
        createdAt: log.createdAt,
        metadata: {
          sessionId: metadata.sessionId,
          userId: metadata.userId,
          userEmail: metadata.userEmail,
          revokedBy: metadata.revokedBy,
          revokedAt: metadata.revokedAt,
        },
      };
    });

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch session audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

