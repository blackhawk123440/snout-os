/**
 * Sitter Tier Details API
 * GET /api/sitters/:id/tier/details
 * 
 * Returns full tier details for Tier tab
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

    // Get tier history (newest first)
    const tierHistory = await (prisma as any).sitterTierHistory.findMany({
      where: { sitterId },
      orderBy: { assignedAt: 'desc' },
      include: {
        tier: true,
      },
      take: 20, // Last 20 tier changes
    });

    // Get metrics windows (7d and 30d if available)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();

    const metrics7d = await (prisma as any).sitterMetricsWindow.findFirst({
      where: {
        orgId,
        sitterId,
        windowStart: { lte: sevenDaysAgo },
        windowEnd: { gte: now },
        windowType: 'weekly_7d',
      },
      orderBy: { updatedAt: 'desc' },
    });

    const metrics30d = await (prisma as any).sitterMetricsWindow.findFirst({
      where: {
        orgId,
        sitterId,
        windowStart: { lte: thirtyDaysAgo },
        windowEnd: { gte: now },
        windowType: 'monthly_30d',
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Parse metadata from latest history for reasons
    let reasons: string[] = [];
    if (latestHistory?.reason) {
      reasons = latestHistory.reason.split('; ').filter(Boolean);
    } else if (latestHistory?.metadata) {
      try {
        const metadata = JSON.parse(latestHistory.metadata);
        if (metadata.reasons) {
          reasons = Array.isArray(metadata.reasons) ? metadata.reasons : [metadata.reasons];
        }
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      currentTier: latestHistory ? {
        name: toCanonicalTierName(latestHistory.tierName || latestHistory.tier?.name || 'Bronze'),
        id: latestHistory.tierId,
        reasons,
        assignedAt: latestHistory.assignedAt,
      } : null,
      metrics7d: metrics7d ? {
        avgResponseSeconds: metrics7d.avgResponseSeconds,
        medianResponseSeconds: metrics7d.medianResponseSeconds,
        responseRate: metrics7d.responseRate,
        offerAcceptRate: metrics7d.offerAcceptRate,
        offerDeclineRate: metrics7d.offerDeclineRate,
        offerExpireRate: metrics7d.offerExpireRate,
        lastUpdated: metrics7d.updatedAt,
      } : null,
      metrics30d: metrics30d ? {
        avgResponseSeconds: metrics30d.avgResponseSeconds,
        medianResponseSeconds: metrics30d.medianResponseSeconds,
        responseRate: metrics30d.responseRate,
        offerAcceptRate: metrics30d.offerAcceptRate,
        offerDeclineRate: metrics30d.offerDeclineRate,
        offerExpireRate: metrics30d.offerExpireRate,
        lastUpdated: metrics30d.updatedAt,
      } : null,
      history: tierHistory.map((h: any) => ({
        id: h.id,
        tierName: toCanonicalTierName(h.tierName || h.tier?.name || 'Bronze'),
        assignedAt: h.assignedAt,
        reason: h.reason,
        metadata: h.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[Tier Details API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier details', message: error.message },
      { status: 500 }
    );
  }
}
