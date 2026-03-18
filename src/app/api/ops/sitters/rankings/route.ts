import { NextResponse } from 'next/server';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getScopedDb(ctx);

  try {
    const sitters = await db.sitter.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true, firstName: true, lastName: true, commissionPercentage: true,
        currentTierId: true,
      },
    });

    const rankings = await Promise.all(sitters.map(async (s: any) => {
      const [totalOffers, acceptedOffers, totalBookings, completedBookings, visitEvents] = await Promise.all([
        db.offerEvent.count({ where: { sitterId: s.id } }),
        db.offerEvent.count({ where: { sitterId: s.id, status: 'accepted' } }),
        db.booking.count({ where: { sitterId: s.id } }),
        db.booking.count({ where: { sitterId: s.id, status: 'completed' } }),
        db.visitEvent.findMany({
          where: { sitterId: s.id, excluded: false },
          select: { checkInAt: true, scheduledStart: true, status: true },
          take: 100,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const acceptanceRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;
      const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

      const onTimeEvents = visitEvents.filter((ve: any) => {
        if (!ve.checkInAt || !ve.scheduledStart) return false;
        return new Date(ve.checkInAt).getTime() - new Date(ve.scheduledStart).getTime() <= 15 * 60 * 1000;
      });
      const onTimeRate = visitEvents.length > 0 ? Math.round((onTimeEvents.length / visitEvents.length) * 100) : 100;

      // Get tier name
      let tierName = 'Entry';
      if (s.currentTierId) {
        const tier = await db.sitterTier.findUnique({ where: { id: s.currentTierId }, select: { name: true } });
        if (tier) tierName = tier.name;
      }

      const compositeScore = (acceptanceRate * 0.25) + (completionRate * 0.25) + (onTimeRate * 0.3) + Math.min(completedBookings, 20) * 1;

      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`.trim(),
        tier: tierName,
        commissionPct: s.commissionPercentage ?? 80,
        acceptanceRate,
        completionRate,
        onTimeRate,
        totalBookings,
        completedBookings,
        compositeScore: Math.round(compositeScore),
      };
    }));

    rankings.sort((a, b) => b.compositeScore - a.compositeScore);

    return NextResponse.json({ rankings }, {
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed', message }, { status: 500 });
  }
}
