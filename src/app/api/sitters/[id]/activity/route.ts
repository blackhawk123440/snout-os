/**
 * Sitter Activity/Logs API
 * GET /api/sitters/:id/activity
 * 
 * Returns audit/event stream for Activity tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Get booking IDs for a sitter (for filtering events)
 */
async function getBookingIdsForSitter(orgId: string, sitterId: string): Promise<string[]> {
  const bookings = await (prisma as any).booking.findMany({
    where: { sitterId },
    select: { id: true },
  });
  return bookings.map((b: any) => b.id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Owner/admin only
  const user = session.user as any;
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;
    const orgId = user.orgId;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Fetch events from EventLog model (filtered by sitterId in metadata)
    const events = await (prisma as any).eventLog.findMany({
      where: {
        OR: [
          { bookingId: { in: await getBookingIdsForSitter(orgId, sitterId) } },
          // Also check metadata for sitterId
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Filter events that are related to this sitter (check metadata)
    const sitterEvents = events.filter((e: any) => {
      if (!e.metadata) return false;
      try {
        const metadata = JSON.parse(e.metadata);
        return metadata.sitterId === sitterId;
      } catch {
        return false;
      }
    });

    return NextResponse.json(sitterEvents.map((e: any) => {
      let metadata: any = {};
      try {
        metadata = JSON.parse(e.metadata || '{}');
      } catch {}

      return {
        id: e.id,
        eventType: e.eventType,
        actorType: metadata.actorType || 'system',
        actorId: metadata.actorId || null,
        entityType: metadata.entityType || null,
        entityId: metadata.entityId || null,
        timestamp: e.createdAt.toISOString(),
        payload: metadata,
      };
    }));
  } catch (error: any) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data', message: error.message },
      { status: 500 }
    );
  }
}
