/**
 * Sitter Threads API Endpoint
 * 
 * GET /api/sitter/threads
 * Returns threads with active assignment windows for the current sitter.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sitterId = await getCurrentSitterId(request);
    if (!sitterId) {
      return NextResponse.json(
        { error: "Sitter access required" },
        { status: 403 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Get threads with active assignment windows for this sitter
    const now = new Date();
    const threads = await prisma.messageThread.findMany({
      where: {
        orgId,
        assignedSitterId: sitterId,
        assignmentWindows: {
          some: {
            sitterId: sitterId,
            startAt: { lte: now },
            endAt: { gte: now },
          },
        },
      },
      include: {
        participants: {
          where: { role: 'client' },
          take: 1,
        },
        messageNumber: {
          select: {
            id: true,
            e164: true,
            numberClass: true,
            status: true,
          },
        },
        assignmentWindows: {
          where: {
            sitterId: sitterId,
            startAt: { lte: now },
            endAt: { gte: now },
          },
          select: {
            id: true,
            startAt: true,
            endAt: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Get client data
    const clientIds = threads.map(t => t.clientId).filter((id): id is string => !!id);
    const clients = clientIds.length > 0 ? await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    }) : [];
    const clientMap = new Map(clients.map(c => [c.id, c]));

    // Format response to match Thread schema
    const formattedThreads = threads.map((thread) => {
      const clientParticipant = thread.participants[0];
      const client = thread.clientId ? clientMap.get(thread.clientId) : null;
      
      return {
        id: thread.id,
        orgId: thread.orgId,
        clientId: thread.clientId || '',
        sitterId: thread.assignedSitterId || null,
        numberId: thread.messageNumberId || '',
        threadType: (thread.threadType || 'assignment') as 'front_desk' | 'assignment' | 'pool' | 'other',
        status: thread.status === 'open' ? 'active' as const : 'inactive' as const,
        ownerUnreadCount: 0, // Sitters don't track owner unread
        lastActivityAt: (thread.lastMessageAt || thread.createdAt).toISOString(),
        client: {
          id: client?.id || thread.clientId || '',
          name: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown' : (clientParticipant?.displayName || 'Unknown'),
          contacts: client?.phone ? [{ e164: client.phone }] : (clientParticipant?.realE164 ? [{ e164: clientParticipant.realE164 }] : []),
        },
        sitter: null, // Sitter doesn't need to see their own info
        messageNumber: {
          id: thread.messageNumber?.id || thread.messageNumberId || '',
          e164: thread.messageNumber?.e164 || '',
          class: thread.messageNumber?.numberClass || 'front_desk',
          status: thread.messageNumber?.status || 'active',
        },
        assignmentWindows: thread.assignmentWindows.map((w) => ({
          id: w.id,
          startsAt: w.startAt.toISOString(),
          endsAt: w.endAt.toISOString(),
        })),
      };
    });

    return NextResponse.json(formattedThreads);
  } catch (error) {
    console.error("[api/sitter/threads] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
