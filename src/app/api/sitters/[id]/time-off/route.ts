/**
 * Time Off API (Owner Only)
 * POST /api/sitters/:id/time-off
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'owner' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;
    const orgId = (session.user as any).orgId;
    const body = await request.json();

    const { type, startsAt, endsAt } = body;

    if (!type || !startsAt || !endsAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timeOff = await (prisma as any).sitterTimeOff.create({
      data: {
        orgId,
        sitterId,
        type,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        approvedByUserId: session.user.id,
      },
    });

    // Exclude responses during time off
    const { excludeTimeOffResponses } = await import('@/lib/tiers/message-instrumentation');
    await excludeTimeOffResponses(orgId, sitterId, {
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    });

    return NextResponse.json({ timeOff });
  } catch (error: any) {
    console.error('[Time Off API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create time off', message: error.message },
      { status: 500 }
    );
  }
}
