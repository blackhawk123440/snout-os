/**
 * Individual Thread API Endpoint
 * 
 * GET /api/messages/threads/[id]
 * Returns thread details with messages (paginated).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
import { env } from "@/lib/env";
import { hasActiveAssignmentWindow, getNextUpcomingWindow } from "@/lib/messaging/routing-resolution";

/**
 * GET /api/messages/threads/[id]
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  console.log('[api/messages/threads/[id]] GET request received for threadId:', threadId);
  try {
    // Phase 4.1: Check feature flag
    if (!env.ENABLE_MESSAGING_V1) {
      console.log('[api/messages/threads/[id]] ENABLE_MESSAGING_V1 is false, returning 404');
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    // Authenticate user
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      console.log('[api/messages/threads/[id]] Unauthorized - no user');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log('[api/messages/threads/[id]] User authenticated:', currentUser.id);

    // Phase 4.1: Determine role
    const currentSitterId = await getCurrentSitterId(request);
    const isSitter = !!currentSitterId;

    // Phase 4.2: Sitter messages behind ENABLE_SITTER_MESSAGES_V1
    if (isSitter && !env.ENABLE_SITTER_MESSAGES_V1) {
      return NextResponse.json(
        { error: "Sitter messages not enabled" },
        { status: 404 }
      );
    }

    // Get orgId from context
    const orgId = await getOrgIdFromContext(currentUser.id);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Phase 4.1: Find thread with messageNumber for number class
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participants: true,
        messageNumber: {
          select: {
            id: true,
            numberClass: true,
            e164: true,
            status: true,
          },
        },
        assignmentWindows: {
          where: {
            status: 'active',
          },
          orderBy: {
            startAt: 'asc',
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Verify org isolation
    if (thread.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized: Thread belongs to different organization" },
        { status: 403 }
      );
    }

    // Phase 4.1: Sitter access control (preparing for Phase 4.2)
    if (isSitter) {
      // Sitters can only access their assigned threads
      if (thread.assignedSitterId !== currentSitterId) {
        return NextResponse.json(
          { error: "Forbidden: You can only access threads assigned to you" },
          { status: 403 }
        );
      }
      // Sitters cannot access owner inbox or billing threads
      if (thread.scope === 'internal' || thread.scope === 'owner_sitter') {
        return NextResponse.json(
          { error: "Forbidden: This thread is not accessible to sitters" },
          { status: 403 }
        );
      }
    }

    // Note: Messages are fetched via separate /api/messages/threads/[id]/messages endpoint
    // This endpoint only returns thread metadata
    const formattedMessages: any[] = [];
    const totalCount = 0;

    // Phase 4.1: Fetch assignment audit history
    const assignmentAudits = await prisma.threadAssignmentAudit.findMany({
      where: {
        threadId: thread.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Last 10 assignments
    });

    // Phase 4.1: Get active window status
    const activeWindow = await prisma.assignmentWindow.findFirst({
      where: {
        threadId: thread.id,
        status: 'active',
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        sitterId: true,
      },
    });

    // Phase 4.1: Check if current sitter has active window (for Phase 4.2)
    let sitterHasActiveWindow = false;
    let nextUpcomingWindow: { startAt: Date; endAt: Date } | null = null;
    if (isSitter && currentSitterId) {
      sitterHasActiveWindow = await hasActiveAssignmentWindow(
        currentSitterId,
        thread.id,
        new Date()
      );
      if (!sitterHasActiveWindow) {
        nextUpcomingWindow = await getNextUpcomingWindow(currentSitterId, thread.id);
      }
    }

    // Phase 4.1: Format thread with enhanced metadata
    const clientParticipant = thread.participants.find(p => p.role === 'client');

    // Get sitter names for assignment history and assigned sitter
    const sitterIds = new Set<string>();
    if (thread.assignedSitterId) sitterIds.add(thread.assignedSitterId);
    assignmentAudits.forEach(audit => {
      if (audit.fromSitterId) sitterIds.add(audit.fromSitterId);
      if (audit.toSitterId) sitterIds.add(audit.toSitterId);
    });

    const sitters = await prisma.sitter.findMany({
      where: {
        id: { in: Array.from(sitterIds) },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const sitterMap = new Map(sitters.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    const assignedSitter = thread.assignedSitterId ? sitterMap.get(thread.assignedSitterId) : null;

    // Format thread to match Zod schema
    const formattedThread = {
      id: thread.id,
      orgId: thread.orgId,
      clientId: thread.clientId || '',
      sitterId: thread.assignedSitterId || null,
      numberId: thread.messageNumberId || thread.messageNumber?.id || '',
      threadType: (thread.numberClass === 'front_desk' ? 'front_desk' :
                   thread.numberClass === 'pool' ? 'pool' :
                   thread.numberClass === 'sitter' ? 'assignment' : 'other') as 'front_desk' | 'assignment' | 'pool' | 'other',
      status: (thread.status === 'open' ? 'active' : 'inactive') as 'active' | 'inactive',
      ownerUnreadCount: thread.ownerUnreadCount,
      lastActivityAt: (thread.lastMessageAt || thread.createdAt).toISOString(),
      client: {
        id: thread.clientId || '',
        name: clientParticipant?.displayName || 'Unknown',
        contacts: clientParticipant?.realE164 ? [{ e164: clientParticipant.realE164 }] : [],
      },
      sitter: thread.assignedSitterId && assignedSitter ? {
        id: thread.assignedSitterId,
        name: assignedSitter,
      } : null,
      messageNumber: {
        id: thread.messageNumber?.id || '',
        e164: thread.messageNumber?.e164 || '',
        class: thread.messageNumber?.numberClass || thread.numberClass || 'front_desk',
        status: thread.messageNumber?.status || 'active',
      },
      assignmentWindows: thread.assignmentWindows.map(w => ({
        id: w.id,
        startsAt: w.startAt.toISOString(),
        endsAt: w.endAt.toISOString(),
      })),
    };

    return NextResponse.json({
      thread: formattedThread,
    });
  } catch (error) {
    console.error("[messages/threads/[id]] Error fetching thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}
