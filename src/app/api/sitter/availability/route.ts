import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * GET /api/sitter/availability
 * Returns availability toggle + block-off days for current sitter.
 */
export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'sitter');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.sitterId) {
    return NextResponse.json({ error: 'Sitter profile missing on session' }, { status: 403 });
  }

  try {
    const sitter = await prisma.sitter.findUnique({
      where: whereOrg(ctx.orgId, { id: ctx.sitterId }),
      select: { availabilityEnabled: true },
    });
    if (!sitter) {
      return NextResponse.json({ error: 'Sitter not found' }, { status: 404 });
    }

    const now = new Date();
    const blockOffs = await prisma.sitterTimeOff.findMany({
      where: whereOrg(ctx.orgId, {
        sitterId: ctx.sitterId,
        type: 'block',
        endsAt: { gte: now },
      }),
      orderBy: { startsAt: 'asc' },
      take: 30,
    });

    return NextResponse.json({
      availabilityEnabled: (sitter as any).availabilityEnabled ?? true,
      blockOffDays: blockOffs.map((b) => ({
        id: b.id,
        date: b.startsAt.toISOString().slice(0, 10),
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load availability', message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sitter/availability
 * Body: { availabilityEnabled?: boolean }
 */
export async function PATCH(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'sitter');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.sitterId || !ctx.userId) {
    return NextResponse.json({ error: 'Sitter profile missing on session' }, { status: 403 });
  }

  let body: { availabilityEnabled?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.availabilityEnabled !== 'boolean') {
    return NextResponse.json({ error: 'availabilityEnabled must be boolean' }, { status: 400 });
  }

  try {
    const sitter = await prisma.sitter.findFirst({
      where: whereOrg(ctx.orgId, { id: ctx.sitterId }),
    });
    if (!sitter) {
      return NextResponse.json({ error: 'Sitter not found' }, { status: 404 });
    }
    await (prisma.sitter as any).update({
      where: { id: sitter.id },
      data: { availabilityEnabled: body.availabilityEnabled },
    });
    return NextResponse.json({ availabilityEnabled: body.availabilityEnabled });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update availability', message },
      { status: 500 }
    );
  }
}
