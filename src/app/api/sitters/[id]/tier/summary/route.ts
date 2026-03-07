/**
 * Sitter Tier Summary API
 * GET /api/sitters/:id/tier/summary
 * 
 * Returns tier summary for Dashboard tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { toCanonicalTierName } from '@/lib/tiers/tier-name-mapper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['owner', 'admin']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;

    const sitter = await prisma.sitter.findFirst({
      where: whereOrg(ctx.orgId, { id: sitterId }),
      select: { id: true },
    });

    if (!sitter) {
      return NextResponse.json({ error: 'Sitter not found' }, { status: 404 });
    }

    // Get current tier from most recent history
    const latestHistory = await (prisma as any).sitterTierHistory.findFirst({
      where: whereOrg(ctx.orgId, { sitterId }),
      orderBy: { periodStart: 'desc' },
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
        orgId: ctx.orgId,
        sitterId,
        windowStart: { lte: sevenDaysAgo },
        windowEnd: { gte: now },
        windowType: 'weekly_7d',
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      currentTier: latestHistory ? {
        name: toCanonicalTierName(latestHistory.tier?.name || 'Bronze'),
        id: latestHistory.tierId,
        assignedAt: latestHistory.periodStart,
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
