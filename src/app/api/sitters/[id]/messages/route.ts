/**
 * Sitter Messages API
 *
 * GET: Fetch threads for a specific sitter (sitter-scoped inbox)
 * Returns threads where sitterId === sitterId (enterprise schema: Thread)
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

  const orgId = user.orgId || (await import('@/lib/messaging/org-helpers')).getDefaultOrgId();

  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 400 }
    );
  }

  if (user.role === 'sitter' && user.sitterId !== sitterId) {
    return NextResponse.json(
      { error: 'Forbidden: You can only view your own messages' },
      { status: 403 }
    );
  }

  try {
    const threads = await (prisma as any).thread.findMany({
      where: {
        orgId,
        sitterId,
        status: 'active',
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        messageNumber: {
          select: { id: true, e164: true, class: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, direction: true, body: true, createdAt: true, senderType: true },
        },
        assignmentWindows: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    const transformedThreads = threads.map((thread: any) => ({
      id: thread.id,
      clientName: thread.client?.name ?? 'Unknown Client',
      bookingId: null,
      booking: null,
      lastMessage: thread.messages?.[0]
        ? {
            id: thread.messages[0].id,
            body: thread.messages[0].body,
            direction: thread.messages[0].direction,
            createdAt: thread.messages[0].createdAt.toISOString(),
            actorType: thread.messages[0].senderType,
          }
        : null,
      lastMessageAt: thread.lastActivityAt?.toISOString() ?? thread.createdAt.toISOString(),
      hasActiveWindow: (thread.assignmentWindows?.length ?? 0) > 0,
      maskedNumber: thread.messageNumber?.e164 ?? null,
      status: thread.status,
    }));

    return NextResponse.json({
      threads: transformedThreads,
      count: transformedThreads.length,
    });
  } catch (error: any) {
    console.error('[Sitter Messages API] Failed to fetch threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitter messages', message: error?.message },
      { status: 500 }
    );
  }
}
