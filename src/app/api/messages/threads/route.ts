/**
 * Threads API Endpoint
 * 
 * GET /api/messages/threads
 * Returns list of message threads with filters and search.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
import { env } from "@/lib/env";

/**
 * GET /api/messages/threads
 * 
 * Query params:
 * - search: Search term (optional)
 * - status: Filter by status (open, closed, archived) (optional)
 * - assignedSitterId: Filter by assigned sitter (optional)
 * - clientId: Filter by client (optional)
 * - bookingId: Filter by booking (optional)
 * - unreadOnly: Only return threads with unread messages (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: NextRequest) {
  console.log('[api/messages/threads] GET request received');
  try {
    // Phase 4.1: Check feature flag
    if (!env.ENABLE_MESSAGING_V1) {
      console.log('[api/messages/threads] ENABLE_MESSAGING_V1 is false, returning 404');
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    // Authenticate user
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      console.log('[api/messages/threads] Unauthorized - no user');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log('[api/messages/threads] User authenticated:', currentUser.id);

    // Phase 4.1: Determine role (owner vs sitter)
    const currentSitterId = await getCurrentSitterId(request);
    const isSitter = !!currentSitterId;
    const isOwner = !isSitter;

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
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const assignedSitterId = searchParams.get("assignedSitterId");
    const clientId = searchParams.get("clientId");
    const bookingId = searchParams.get("bookingId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const inbox = searchParams.get("inbox"); // 'all' | 'owner'
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Phase 4.1: Role-based filtering
    // Sitters: Only see assigned threads, no owner inbox, no billing threads
    // Owners: See all threads
    const where: any = {
      orgId,
    };

    if (isSitter) {
      // Phase 4.2: Sitter scoping
      where.assignedSitterId = currentSitterId;
      where.scope = {
        notIn: ['internal', 'owner_sitter'], // No owner inbox, no billing threads
      };
      // Phase 4.2: When ENABLE_SITTER_MESSAGES_V1, only threads with active OR upcoming window (or explicitly allowed meet-and-greet)
      const now = new Date();
      if (env.ENABLE_SITTER_MESSAGES_V1) {
        where.AND = [
          {
            OR: [
              {
                assignmentWindows: {
                  some: {
                    sitterId: currentSitterId!,
                    status: 'active',
                    startAt: { lte: now },
                    endAt: { gte: now },
                  },
                },
              },
              {
                assignmentWindows: {
                  some: {
                    sitterId: currentSitterId!,
                    status: 'active',
                    startAt: { gt: now },
                  },
                },
              },
              // Explicitly allowed meet-and-greet: isMeetAndGreet with active/upcoming window (covered above) or owner-allowed
              // For simplicity, meet-and-greet with any window for this sitter is included via the OR above
            ],
          },
        ];
      }
    } else {
      // Owner: Can see all threads, but can filter by scope or inbox type
      const scope = searchParams.get("scope");
      if (scope) {
        where.scope = scope;
      } else if (inbox === 'owner') {
        // Filter to owner inbox (scope='internal')
        where.scope = 'internal';
      }
      // If inbox='all' or not specified, no scope filter (show all threads)
    }

    if (status) {
      where.status = status;
    }

    if (assignedSitterId && isOwner) {
      // Only owners can filter by assignedSitterId
      where.assignedSitterId = assignedSitterId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (unreadOnly) {
      where.ownerUnreadCount = {
        gt: 0,
      };
    }

    // Filter by policy violations (check for AntiPoachingAttempt on events)
    const hasPolicyViolation = searchParams.get("hasPolicyViolation") === "true";
    if (hasPolicyViolation) {
      where.events = {
        some: {
          AntiPoachingAttempt: {
            isNot: null,
          },
        },
      };
    }

    // Filter by delivery failures (check deliveryStatus on events)
    const hasDeliveryFailure = searchParams.get("hasDeliveryFailure") === "true";
    if (hasDeliveryFailure) {
      where.events = {
        some: {
          deliveryStatus: 'failed',
        },
      };
    }

    // Filter by sitterId (assignedSitterId)
    const sitterIdParam = searchParams.get("sitterId");
    if (sitterIdParam && isOwner) {
      where.assignedSitterId = sitterIdParam;
    }

    // Search by participant name or phone (if search term provided)
    if (search) {
      // This is a simplified search - in production, might want more sophisticated search
      where.OR = [
        {
          participants: {
            some: {
              displayName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          participants: {
            some: {
              realE164: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    const nowForFetch = new Date();
    const isSitterWithMessages = isSitter && env.ENABLE_SITTER_MESSAGES_V1;

    // Phase 4.1: Fetch threads with enhanced data
    const threads = await prisma.messageThread.findMany({
      where,
      include: {
        participants: {
          where: {
            role: 'client',
          },
          take: 1,
        },
        events: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            AntiPoachingAttempt: true,
          },
        },
        messageNumber: {
          select: {
            id: true,
            numberClass: true,
            e164: true,
            status: true,
          },
        },
        assignmentWindows: isSitterWithMessages && currentSitterId
          ? {
              where: {
                status: 'active',
                sitterId: currentSitterId,
              },
              orderBy: { startAt: 'asc' as const },
              take: 5,
            }
          : {
              where: {
                status: 'active',
                startAt: { lte: nowForFetch },
                endAt: { gte: nowForFetch },
              },
              take: 1,
            },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Phase 4.1: Get sitter names for all assigned sitters
    const assignedSitterIds = threads
      .map(t => t.assignedSitterId)
      .filter((id): id is string => !!id);
    
    const sitters = assignedSitterIds.length > 0 ? await prisma.sitter.findMany({
      where: {
        id: { in: assignedSitterIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }) : [];

    const sitterMap = new Map(sitters.map(s => [s.id, { id: s.id, name: `${s.firstName} ${s.lastName}` }]));

    // Get client data for all threads
    const clientIds = threads
      .map(t => t.clientId)
      .filter((id): id is string => !!id);
    
    // Note: Root schema Client model doesn't have 'contacts' relation
    // This route requires messaging schema to function properly
    const clients = clientIds.length > 0 ? await prisma.client.findMany({
      where: {
        id: { in: clientIds },
      },
      // Root schema Client doesn't have contacts relation
      // Only include if messaging schema is available
      // include: {
      //   contacts: {
      //     select: {
      //       e164: true,
      //     },
      //   },
      // },
    }) : [];

    const clientMap = new Map(clients.map(c => [c.id, c]));

    // Phase 4.1: Format threads with enhanced metadata to match Zod schema
    const formattedThreads = threads.map((thread) => {
      const clientParticipant = thread.participants[0];
      const lastEvent = thread.events[0];
      
      // Phase 4.1: Extract anti-poaching flag from last event
      const metadata = lastEvent?.metadataJson ? JSON.parse(lastEvent.metadataJson) : {};
      const hasAntiPoachingFlag = lastEvent?.AntiPoachingAttempt !== null || metadata.antiPoachingFlagged === true;
      const isBlocked = metadata.wasBlocked === true;

      // Phase 4.1: Number class from MessageNumber (derived, not stored on thread)
      const numberClass = thread.messageNumber?.numberClass || thread.numberClass || 'front_desk';
      const threadType = numberClass === 'front_desk' ? 'front_desk' : numberClass === 'sitter' ? 'assignment' : 'pool';

      // Get client data
      const client = thread.clientId ? clientMap.get(thread.clientId) : null;
      // Root schema Client doesn't have 'contacts' relation - use phone field or participant data
      const clientData = client ? {
        id: client.id,
        name: (client as any).name || `${(client as any).firstName || ''} ${(client as any).lastName || ''}`.trim(),
        contacts: (client as any).contacts ? 
          (client as any).contacts.map((c: any) => ({ e164: c.e164 })) : 
          (client as any).phone ? [{ e164: (client as any).phone }] : [],
      } : {
        id: thread.clientId || '',
        name: clientParticipant?.displayName || 'Unknown',
        contacts: clientParticipant?.realE164 ? [{ e164: clientParticipant.realE164 }] : [],
      };

      // Get sitter data
      const sitterData = thread.assignedSitterId ? sitterMap.get(thread.assignedSitterId) || null : null;

      // Phase 4.1: Active window status
      const hasActiveWindow = thread.assignmentWindows.length > 0;

      // Phase 4.2: For sitter, compute active vs upcoming window
      let activeWindow: { startAt: string; endAt: string } | null = null;
      let nextUpcomingWindow: { startAt: string; endAt: string } | null = null;
      if (isSitterWithMessages && thread.assignmentWindows.length > 0) {
        const now = new Date();
        const active = thread.assignmentWindows.find(
          (w) => w.startAt <= now && w.endAt >= now
        );
        const upcoming = thread.assignmentWindows.find((w) => w.startAt > now);
        if (active) {
          activeWindow = { startAt: active.startAt.toISOString(), endAt: active.endAt.toISOString() };
        }
        if (upcoming) {
          nextUpcomingWindow = { startAt: upcoming.startAt.toISOString(), endAt: upcoming.endAt.toISOString() };
        }
      }

      // Format to match Zod schema
      return {
        id: thread.id,
        orgId: thread.orgId,
        clientId: thread.clientId || '',
        sitterId: thread.assignedSitterId || null,
        numberId: thread.messageNumberId || '',
        threadType,
        status: thread.status === 'open' ? 'active' : 'inactive',
        ownerUnreadCount: thread.ownerUnreadCount,
        lastActivityAt: thread.lastMessageAt || thread.createdAt,
        client: clientData,
        sitter: sitterData,
        messageNumber: {
          id: thread.messageNumber?.id || thread.messageNumberId || '',
          e164: thread.messageNumber?.e164 || clientParticipant?.realE164 || '',
          class: numberClass,
          status: thread.messageNumber?.status || 'active',
        },
        assignmentWindows: thread.assignmentWindows.map(w => ({
          id: w.id,
          startsAt: w.startAt.toISOString(),
          endsAt: w.endAt.toISOString(),
        })),
        // Additional metadata for UI
        participantName: clientParticipant?.displayName || 'Unknown',
        participantPhone: clientParticipant?.realE164 || '',
        lastMessage: lastEvent?.body || '',
        lastMessageAt: lastEvent?.createdAt || thread.lastMessageAt || thread.createdAt,
        bookingId: thread.bookingId,
        hasActiveWindow,
        scope: thread.scope,
        hasAntiPoachingFlag,
        isBlocked: isBlocked && lastEvent?.id,
        blockedEventId: isBlocked ? lastEvent?.id : null,
        // Phase 4.2: Sitter window status
        ...(isSitterWithMessages && { activeWindow, nextUpcomingWindow }),
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.messageThread.count({ where });

    return NextResponse.json({
      threads: formattedThreads,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("[messages/threads] Error fetching threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
