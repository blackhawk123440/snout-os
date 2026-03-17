import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { logEvent } from '@/lib/log-event';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: clientId } = await params;

  try {
    const client = await (prisma as any).client.findFirst({
      where: whereOrg(ctx.orgId, { id: clientId }),
      select: { id: true, firstName: true, lastName: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Find pet names
    const pets = await (prisma as any).pet.findMany({
      where: whereOrg(ctx.orgId, { clientId, isActive: true }),
      select: { name: true },
      take: 5,
    });
    const petNames = pets.map((p: any) => p.name).filter(Boolean).join(', ') || 'your pets';

    // Find thread
    const thread = await (prisma as any).messageThread.findFirst({
      where: { orgId: ctx.orgId, clientId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (thread) {
      const { sendThreadMessage } = await import('@/lib/messaging/send');
      const body = `Hi ${client.firstName}, we miss ${petNames}! It's been a while since your last visit. We'd love to see you again \u2014 book your next visit anytime in the Snout portal.`;
      await sendThreadMessage({
        orgId: ctx.orgId,
        threadId: thread.id,
        body,
        actor: { role: 'system' },
      });
    }

    await logEvent({
      orgId: ctx.orgId,
      action: 'client.win_back_sent',
      status: 'success',
      metadata: { clientId, clientName: `${client.firstName} ${client.lastName}`.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed', message }, { status: 500 });
  }
}
