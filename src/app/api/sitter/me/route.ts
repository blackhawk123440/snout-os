import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * GET /api/sitter/me
 * Returns the current sitter's profile. Requires SITTER role.
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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        active: true,
        commissionPercentage: true,
        availabilityEnabled: true,
      },
    });

    if (!sitter) {
      return NextResponse.json({ error: 'Sitter not found' }, { status: 404 });
    }

    const s = sitter as any;
    return NextResponse.json({
      id: sitter.id,
      firstName: sitter.firstName,
      lastName: sitter.lastName,
      email: sitter.email,
      phone: sitter.phone,
      active: sitter.active,
      commissionPercentage: sitter.commissionPercentage,
      availabilityEnabled: s.availabilityEnabled ?? true,
      name: `${sitter.firstName} ${sitter.lastName}`.trim() || sitter.email,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load sitter profile', message },
      { status: 500 }
    );
  }
}
