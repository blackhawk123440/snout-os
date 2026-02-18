/**
 * Sitter Messages API
 * 
 * GET: Fetch threads for a specific sitter (sitter-scoped inbox)
 * Returns ONLY threads where assignedSitterId === sitterId
 * Owner can view sitter's inbox via this endpoint (read-only visibility)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const resolvedParams = await params;
  const sitterId = resolvedParams.id;

  // Get orgId from session or use default
  const orgId = user.orgId || (await import('@/lib/messaging/org-helpers')).getDefaultOrgId();

  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 400 }
    );
  }

  // Permission check: sitter can only view their own threads, owner/admin can view any sitter's threads
  if (user.role === 'sitter' && user.sitterId !== sitterId) {
    return NextResponse.json(
      { error: 'Forbidden: You can only view your own messages' },
      { status: 403 }
    );
  }

  try {
    // Fetch threads scoped to this sitter
    // Only return threads where assignedSitterId === sitterId
    const threads = await (prisma as any).messageThread.findMany({
      where: {
        orgId,
        assignedSitterId: sitterId,
        // Exclude closed/archived threads by default (can add filter later)
        status: { notIn: ['closed', 'archived'] },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            startAt: true,
            endAt: true,
            service: true,
          },
        },
        messageNumber: {
          select: {
            id: true,
            e164: true,
            numberClass: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest message only
          select: {
            id: true,
            direction: true,
            body: true,
            createdAt: true,
            actorType: true,
          },
        },
        assignmentWindows: {
          where: {
            endsAt: { gte: new Date() }, // Active windows only
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Transform to match frontend expectations
    const transformedThreads = threads.map((thread: any) => ({
      id: thread.id,
      clientName: thread.client?.name || 'Unknown Client',
      bookingId: thread.bookingId,
      booking: thread.booking ? {
        id: thread.booking.id,
        clientName: `${thread.booking.firstName} ${thread.booking.lastName}`,
        service: thread.booking.service,
        startAt: thread.booking.startAt?.toISOString(),
        endAt: thread.booking.endAt?.toISOString(),
      } : null,
      lastMessage: thread.events?.[0] ? {
        id: thread.events[0].id,
        body: thread.events[0].body,
        direction: thread.events[0].direction,
        createdAt: thread.events[0].createdAt.toISOString(),
        actorType: thread.events[0].actorType,
      } : null,
      lastMessageAt: thread.lastMessageAt?.toISOString() || thread.createdAt.toISOString(),
      hasActiveWindow: (thread.assignmentWindows?.length || 0) > 0,
      maskedNumber: thread.maskedNumberE164,
      status: thread.status,
    }));

    return NextResponse.json({
      threads: transformedThreads,
      count: transformedThreads.length,
    });
  } catch (error: any) {
    console.error('[Sitter Messages API] Failed to fetch threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitter messages', message: error.message },
      { status: 500 }
    );
  }
}
