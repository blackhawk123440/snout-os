import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireOwnerOrAdmin } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: clientId } = await params;

  try {
    const allPets = await (prisma as any).pet.findMany({
      where: whereOrg(ctx.orgId, { clientId, isActive: true }),
      select: {
        id: true, name: true, species: true, breed: true, weight: true,
        photoUrl: true, feedingInstructions: true, medicationNotes: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    // Deduplicate by name+species
    const seen = new Map<string, typeof allPets[0]>();
    for (const p of allPets) {
      const key = `${(p.name || '').toLowerCase()}::${(p.species || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, p);
      }
    }

    const pets = Array.from(seen.values())
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({ pets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load pets', message },
      { status: 500 }
    );
  }
}
