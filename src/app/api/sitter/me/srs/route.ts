/**
 * Sitter SRS API Endpoint (Sitter Only)
 * GET /api/sitter/me/srs
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentSitterId } from '@/lib/sitter-helpers';
import { calculateSRS, calculateRolling26WeekScore } from '@/lib/tiers/srs-engine';
import { getTierPerks } from '@/lib/tiers/tier-rules';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sitterId = await getCurrentSitterId(request);
    if (!sitterId) {
      return NextResponse.json({ error: 'Sitter not found' }, { status: 404 });
    }

    // Get orgId
    let orgId = (session.user as any).orgId;
    if (!orgId) {
      // Derive from sitter
      const thread = await (prisma as any).messageThread.findFirst({
        where: { assignedSitterId: sitterId },
        select: { orgId: true },
      });
      if (!thread?.orgId) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
      }
      orgId = thread.orgId;
    }

    // Get latest snapshot
    const latestSnapshot = await (prisma as any).sitterTierSnapshot.findFirst({
      where: { orgId, sitterId },
      orderBy: { asOfDate: 'desc' },
    });

    // Calculate current if needed
    const asOfDate = new Date();
    const currentSRS = latestSnapshot ? null : await calculateSRS(orgId, sitterId, asOfDate);
    const rolling26w = latestSnapshot ? null : await calculateRolling26WeekScore(orgId, sitterId, asOfDate);

    // Get compensation
    const compensation = await (prisma as any).sitterCompensation.findUnique({
      where: { orgId_sitterId: { orgId, sitterId } },
    });

    const tier = latestSnapshot?.tier || currentSRS?.tierRecommendation || 'foundation';
    const perks = getTierPerks(tier as any);

    return NextResponse.json({
      tier,
      score: latestSnapshot?.rolling30dScore || currentSRS?.score || 0,
      provisional: latestSnapshot?.provisional ?? currentSRS?.provisional ?? false,
      atRisk: latestSnapshot?.atRisk || false,
      atRiskReason: latestSnapshot?.atRiskReason,
      breakdown: latestSnapshot 
        ? JSON.parse(latestSnapshot.rolling30dBreakdownJson)
        : currentSRS?.breakdown,
      visits30d: latestSnapshot?.visits30d || currentSRS?.visits30d || 0,
      rolling26w: latestSnapshot?.rolling26wScore || rolling26w?.score,
      compensation: compensation ? {
        basePay: compensation.basePay,
        nextReviewDate: compensation.nextReviewDate,
      } : null,
      perks,
      nextActions: generateNextActions(latestSnapshot || currentSRS, tier),
    });
  } catch (error: any) {
    console.error('[Sitter SRS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SRS data', message: error.message },
      { status: 500 }
    );
  }
}

function generateNextActions(snapshot: any, tier: string): string[] {
  const actions: string[] = [];
  
  if (!snapshot) return ['Complete your first visits to generate a score'];

  if (snapshot.provisional) {
    actions.push('Complete 15+ visits in 30 days to activate your score');
  }

  if (snapshot.atRisk) {
    actions.push(`Address: ${snapshot.atRiskReason || 'Score below tier minimum'}`);
  }

  const breakdown = snapshot.breakdown || JSON.parse(snapshot.rolling30dBreakdownJson || '{}');
  
  if (breakdown.responsiveness < 15) {
    actions.push('Improve response time to client messages');
  }
  if (breakdown.acceptance < 10) {
    actions.push('Increase booking acceptance rate');
  }
  if (breakdown.timeliness < 15) {
    actions.push('Improve on-time arrival rate');
  }
  if (breakdown.accuracy < 15) {
    actions.push('Reduce missed care items and errors');
  }
  if (breakdown.engagement < 8) {
    actions.push('Complete more visits to meet quota');
  }

  if (actions.length === 0) {
    actions.push('Maintain current performance to keep tier');
  }

  return actions;
}
