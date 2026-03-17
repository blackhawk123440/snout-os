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
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [client, petCount, contactCount] = await Promise.all([
      (prisma as any).client.findFirst({
        where: whereOrg(ctx.orgId, { id: ctx.clientId }),
        select: { address: true, keyLocation: true, entryInstructions: true },
      }),
      (prisma as any).pet.count({
        where: whereOrg(ctx.orgId, { clientId: ctx.clientId, isActive: true }),
      }),
      (prisma as any).clientEmergencyContact.count({
        where: whereOrg(ctx.orgId, { clientId: ctx.clientId }),
      }),
    ]);

    const hasAddress = !!client?.address?.trim();
    const hasHomeAccess = !!(client?.keyLocation?.trim() || client?.entryInstructions?.trim());
    const hasPets = petCount > 0;
    const hasEmergencyContact = contactCount > 0;

    const checks = [true, hasPets, hasEmergencyContact, hasAddress, hasHomeAccess];
    const done = checks.filter(Boolean).length;
    const completionPercent = Math.round((done / checks.length) * 100);

    return NextResponse.json({
      hasAccount: true,
      hasPets,
      hasEmergencyContact,
      hasAddress,
      hasHomeAccess,
      completionPercent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load status', message }, { status: 500 });
  }
}
