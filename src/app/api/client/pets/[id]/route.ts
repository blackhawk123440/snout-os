import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const pet = await (prisma as any).pet.findFirst({
      where: {
        id,
        booking: whereOrg(ctx.orgId, { clientId: ctx.clientId }),
      },
      select: { id: true, name: true, species: true, breed: true, notes: true },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      notes: pet.notes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load pet', message },
      { status: 500 }
    );
  }
}
