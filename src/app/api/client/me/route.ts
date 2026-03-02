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
    const client = await (prisma as any).client.findFirst({
      where: whereOrg(ctx.orgId, { id: ctx.clientId }),
      select: { firstName: true, lastName: true, email: true, phone: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || null;
    return NextResponse.json({
      ...client,
      name,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load profile', message },
      { status: 500 }
    );
  }
}
