import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

const UpdateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(5).max(30).optional(),
  relationship: z.string().max(50).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateContactSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const existing = await (prisma as any).clientEmergencyContact.findFirst({
      where: whereOrg(ctx.orgId, { id, clientId: ctx.clientId }),
    });
    if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value;
    }

    const updated = await (prisma as any).clientEmergencyContact.update({
      where: { id },
      data,
      select: { id: true, name: true, phone: true, relationship: true },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update contact', message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).clientEmergencyContact.findFirst({
      where: whereOrg(ctx.orgId, { id, clientId: ctx.clientId }),
    });
    if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    await (prisma as any).clientEmergencyContact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete contact', message }, { status: 500 });
  }
}
