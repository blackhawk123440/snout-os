import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pets = await (prisma as any).pet.findMany({
      where: {
        booking: whereOrg(ctx.orgId, { clientId: ctx.clientId }),
      },
      select: { id: true, name: true, species: true, breed: true },
      orderBy: { name: 'asc' },
      take: 100,
    });

    const payload = pets.map((p: any) => ({
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
    }));

    return NextResponse.json({ pets: payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load pets', message },
      { status: 500 }
    );
  }
}
