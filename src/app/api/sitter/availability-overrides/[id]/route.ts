/**
 * DELETE /api/sitter/availability-overrides/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getRequestContext();
    requireRole(ctx, 'sitter');
    if (!ctx.sitterId) {
      return NextResponse.json({ error: 'Sitter profile missing' }, { status: 403 });
    }

    const { id } = await params;
    const result = await (prisma as any).sitterAvailabilityOverride.deleteMany({
      where: whereOrg(ctx.orgId, { id, sitterId: ctx.sitterId }),
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
