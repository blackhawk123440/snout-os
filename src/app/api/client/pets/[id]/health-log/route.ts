import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

const HealthLogSchema = z.object({
  type: z.enum(['daily', 'alert', 'vet', 'allergy']),
  note: z.string().min(1).max(2000),
});

export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const parsed = HealthLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify pet belongs to client
    const pet = await (prisma as any).pet.findFirst({
      where: whereOrg(ctx.orgId, { id, clientId: ctx.clientId }),
      select: { id: true, name: true },
    });
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const log = await (prisma as any).petHealthLog.create({
      data: {
        orgId: ctx.orgId,
        petId: id,
        type: parsed.data.type,
        note: parsed.data.note,
      },
    });

    // N10: Notify owner of health concern (alert or vet types)
    if (parsed.data.type === 'alert' || parsed.data.type === 'vet') {
      void import('@/lib/notifications/triggers').then(({ notifyOwnerHealthConcern }) => {
        notifyOwnerHealthConcern({
          orgId: ctx.orgId,
          petId: id,
          petName: (pet as any).name || 'Pet',
          sitterName: 'Client',
          note: parsed.data.note,
        });
      }).catch(() => {});
    }

    return NextResponse.json(
      { id: log.id, type: log.type, note: log.note, createdAt: log.createdAt },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to add health log', message },
      { status: 500 }
    );
  }
}
