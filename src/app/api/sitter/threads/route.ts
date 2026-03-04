/**
 * Sitter Threads Route
 * 
 * GET /api/sitter/threads
 * Returns threads for the authenticated sitter with active assignment windows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  
  // Must be a sitter
  if (!user.sitterId) {
    return NextResponse.json(
      { error: 'Sitter access required' },
      { status: 403 }
    );
  }

  const orgId = user.orgId || 'default';
  const sitterId = user.sitterId;
  const now = new Date();

  try {
    // Find threads with active assignment windows for this sitter
    const threads = await (prisma as any).messageThread.findMany({
      where: {
        orgId,
        assignedSitterId: sitterId,
        status: 'open',
        assignmentWindows: {
          some: {
            sitterId,
            startAt: { lte: now },
            endAt: { gte: now },
          },
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        messageNumber: {
          select: {
            id: true,
            e164: true,
            class: true,
            status: true,
          },
        },
        assignmentWindows: {
          where: {
            sitterId,
            startAt: { lte: now },
            endAt: { gte: now },
          },
          orderBy: { startAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const toIso = (d: Date | null | undefined) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

    // Sitter never sees client phone (no contacts included); expose lastActivityAt + ownerUnreadCount; normalize window fields for frontend
    const transformedThreads = threads.map((thread: any) => ({
      ...thread,
      lastActivityAt: toIso(thread.lastMessageAt ?? thread.createdAt) ?? new Date().toISOString(),
      ownerUnreadCount: thread.ownerUnreadCount ?? 0,
      assignmentWindows: (thread.assignmentWindows ?? []).map((w: any) => ({
        ...w,
        startsAt: w.startsAt ?? w.startAt,
        endsAt: w.endsAt ?? w.endAt,
      })),
      client: { ...thread.client, contacts: [] },
    }));

    return NextResponse.json(transformedThreads, { status: 200 });
  } catch (error: any) {
    console.error('[Sitter Threads] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads', details: error.message },
      { status: 500 }
    );
  }
}
