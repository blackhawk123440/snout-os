/**
 * Sitter Tier Summary API
 * GET /api/sitters/:id/tier/summary
 * 
 * Returns tier summary for Dashboard tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { toCanonicalTierName } from '@/lib/tiers/tier-name-mapper';

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
    const orgId = (session.user as any).orgId;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Get current tier from most recent history
    const latestHistory = await (prisma as any).sitterTierHistory.findFirst({
      where: { sitterId },
      orderBy: { assignedAt: 'desc' },
      include: {
        tier: true,
      },
    });

    // Get latest metrics window (7-day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const now = new Date();

    const metricsWindow = await (prisma as any).sitterMetricsWindow.findFirst({
      where: {
        orgId,
        sitterId,
        windowStart: { lte: sevenDaysAgo },
        windowEnd: { gte: now },
        windowType: 'weekly_7d',
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      currentTier: latestHistory ? {
        name: toCanonicalTierName(latestHistory.tierName || latestHistory.tier?.name || 'Bronze'),
        id: latestHistory.tierId,
      } : null,
      metrics: metricsWindow ? {
        avgResponseSeconds: metricsWindow.avgResponseSeconds,
        offerAcceptRate: metricsWindow.offerAcceptRate,
        offerDeclineRate: metricsWindow.offerDeclineRate,
        offerExpireRate: metricsWindow.offerExpireRate,
        lastUpdated: metricsWindow.updatedAt,
      } : null,
    });
  } catch (error: any) {
    console.error('[Tier Summary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier summary', message: error.message },
      { status: 500 }
    );
  }
}
