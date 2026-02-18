/**
 * Sitter Activity/Logs API
 * GET /api/sitters/:id/activity
 * 
 * Returns audit/event stream for Activity tab
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

    // Check if AuditEvent model exists in Prisma schema
    // If not, return foundation state (empty array)
    try {
      const events = await (prisma as any).auditEvent.findMany({
        where: {
          orgId,
          entityType: 'sitter',
          entityId: sitterId,
        },
        orderBy: {
          ts: 'desc',
        },
        take: 50,
      });

      return NextResponse.json(events.map((e: any) => ({
        id: e.id,
        eventType: e.eventType,
        actorType: e.actorType,
        actorId: e.actorId,
        entityType: e.entityType,
        entityId: e.entityId,
        timestamp: e.ts.toISOString(),
        payload: e.payload || {},
      })));
    } catch (error: any) {
      // AuditEvent model may not exist - return empty array (foundation state)
      if (error.message?.includes('model') || error.message?.includes('undefined')) {
        return NextResponse.json([]);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data', message: error.message },
      { status: 500 }
    );
  }
}
