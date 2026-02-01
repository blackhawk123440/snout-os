/**
 * Assignment Windows API Endpoint
 * 
 * GET /api/assignments/windows - List assignment windows
 * POST /api/assignments/windows - Create assignment window
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
    const { searchParams } = new URL(request.url);
    
    const threadId = searchParams.get('threadId');
    const sitterId = searchParams.get('sitterId');
    const status = searchParams.get('status');

    const where: any = {
      thread: { orgId },
    };
    
    if (threadId) {
      where.threadId = threadId;
    }
    
    if (sitterId) {
      where.sitterId = sitterId;
    }

    const now = new Date();
    if (status === 'active') {
      where.startAt = { lte: now };
      where.endAt = { gte: now };
    } else if (status === 'future') {
      where.startAt = { gt: now };
    } else if (status === 'past') {
      where.endAt = { lt: now };
    }

    const windows = await prisma.assignmentWindow.findMany({
      where,
      include: {
        thread: {
          select: {
            id: true,
            clientId: true,
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
        startAt: 'desc',
      },
    });

    // Fetch client data separately
    const clientIds = windows.map(w => w.thread.clientId).filter((id): id is string => !!id);
    const clients = clientIds.length > 0 ? await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }) : [];
    const clientMap = new Map(clients.map(c => [c.id, c]));

    return NextResponse.json(windows.map(w => {
      const now = new Date();
      let status: 'active' | 'future' | 'past' = 'past';
      if (w.startAt <= now && w.endAt >= now) {
        status = 'active';
      } else if (w.startAt > now) {
        status = 'future';
      }

      const client = w.thread.clientId ? clientMap.get(w.thread.clientId) : null;

      return {
        id: w.id,
        threadId: w.threadId,
        sitterId: w.sitterId,
        startsAt: w.startAt.toISOString(),
        endsAt: w.endAt.toISOString(),
        bookingRef: w.bookingRef,
        status,
        thread: {
          id: w.thread.id,
          client: {
            id: client?.id || 'unknown',
            name: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
          },
        },
        sitter: {
          id: w.sitter.id,
          name: `${w.sitter.firstName} ${w.sitter.lastName}`,
        },
      };
    }));
  } catch (error: any) {
    console.error("[assignments/windows] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment windows" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();

    const { threadId, sitterId, startsAt, endsAt, bookingRef } = body;

    if (!threadId || !sitterId || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "threadId, sitterId, startsAt, and endsAt are required" },
        { status: 400 }
      );
    }

    // Verify thread belongs to org
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId, orgId },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Verify sitter exists
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: "Sitter not found" },
        { status: 404 }
      );
    }

    const window = await prisma.assignmentWindow.create({
      data: {
        orgId,
        threadId,
        sitterId,
        startAt: new Date(startsAt),
        endAt: new Date(endsAt),
        bookingRef: bookingRef || null,
        status: 'active',
      },
      include: {
        thread: {
          select: {
            id: true,
            clientId: true,
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

    // Fetch client data
    const client = window.thread.clientId ? await prisma.client.findUnique({
      where: { id: window.thread.clientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }) : null;

    const now = new Date();
    let status: 'active' | 'future' | 'past' = 'past';
    if (window.startAt <= now && window.endAt >= now) {
      status = 'active';
    } else if (window.startAt > now) {
      status = 'future';
    }

    return NextResponse.json({
      id: window.id,
      threadId: window.threadId,
      sitterId: window.sitterId,
      startsAt: window.startAt.toISOString(),
      endsAt: window.endAt.toISOString(),
      bookingRef: window.bookingRef,
      status,
      thread: {
        id: window.thread.id,
        client: {
          id: client?.id || 'unknown',
          name: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
        },
      },
      sitter: {
        id: window.sitter.id,
        name: `${window.sitter.firstName} ${window.sitter.lastName}`,
      },
    });
  } catch (error: any) {
    console.error("[assignments/windows] Error:", error);
    return NextResponse.json(
      { error: "Failed to create assignment window" },
      { status: 500 }
    );
  }
}
