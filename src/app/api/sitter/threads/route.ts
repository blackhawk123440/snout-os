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
    const threads = await (prisma as any).thread.findMany({
      where: {
        orgId,
        sitterId,
        status: 'active',
        assignmentWindows: {
          some: {
            sitterId,
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
      },
      include: {
        client: {
          include: {
            contacts: {
              where: {
                orgId,
              },
              select: {
                e164: true, // Only return E164, not full contact (privacy)
              },
            },
          },
        },
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
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    // Transform to hide client E164 from sitter
    const transformedThreads = threads.map((thread: any) => ({
      ...thread,
      client: {
        ...thread.client,
        contacts: [], // Remove E164 - sitter should never see client phone
      },
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
