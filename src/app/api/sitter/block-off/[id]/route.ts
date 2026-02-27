import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * DELETE /api/sitter/block-off/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const block = await prisma.sitterTimeOff.findFirst({
      where: whereOrg(ctx.orgId, {
        id,
        sitterId: ctx.sitterId,
        type: 'block',
      }),
    });
    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    await prisma.sitterTimeOff.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to remove block-off day', message },
      { status: 500 }
    );
  }
}
