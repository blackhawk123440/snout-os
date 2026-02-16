/**
 * SRS List API Endpoint (Owner Only)
 * GET /api/sitters/srs
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Owner only
  if (session.user.role !== 'owner' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const orgId = (session.user as any).orgId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Get all sitters with latest snapshots
    const snapshots = await (prisma as any).sitterTierSnapshot.findMany({
      where: { orgId },
      include: {
        sitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            active: true,
          },
        },
      },
      orderBy: [
        { sitterId: 'asc' },
        { asOfDate: 'desc' },
      ],
    });

    // Group by sitter and get latest
    const sitterMap = new Map();
    for (const snapshot of snapshots) {
      if (!sitterMap.has(snapshot.sitterId)) {
        sitterMap.set(snapshot.sitterId, snapshot);
      }
    }

    const results = Array.from(sitterMap.values()).map((snapshot: any) => ({
      sitterId: snapshot.sitterId,
      sitter: snapshot.sitter,
      tier: snapshot.tier,
      score: snapshot.rolling30dScore,
      provisional: snapshot.provisional,
      atRisk: snapshot.atRisk,
      atRiskReason: snapshot.atRiskReason,
      visits30d: snapshot.visits30d,
      lastUpdated: snapshot.asOfDate,
      breakdown: JSON.parse(snapshot.rolling30dBreakdownJson),
    }));

    return NextResponse.json({ sitters: results });
  } catch (error: any) {
    console.error('[SRS List API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SRS list', message: error.message },
      { status: 500 }
    );
  }
}
