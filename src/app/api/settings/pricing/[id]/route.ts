import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, ForbiddenError } from '@/lib/rbac';
import { assertOrgAccess } from '@/lib/rbac';

async function getOwnerCtx() {
  const ctx = await getRequestContext();
  requireAnyRole(ctx, ['owner', 'admin']);
  return ctx;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOwnerCtx();
    const { id } = await params;
    const row = await prisma.pricingRule.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    assertOrgAccess(row.orgId, ctx.orgId);
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw e;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOwnerCtx();
    const { id } = await params;
    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    assertOrgAccess(existing.orgId, ctx.orgId);
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim() || existing.name;
    if (body.description !== undefined) data.description = body.description == null ? null : String(body.description);
    if (body.type !== undefined) data.type = String(body.type);
    if (body.conditions !== undefined) data.conditions = typeof body.conditions === 'string' ? body.conditions : JSON.stringify(body.conditions ?? {});
    if (body.calculation !== undefined) data.calculation = typeof body.calculation === 'string' ? body.calculation : JSON.stringify(body.calculation ?? {});
    if (body.priority !== undefined) data.priority = Number(body.priority);
    if (body.enabled !== undefined) data.enabled = body.enabled === true;
    const updated = await prisma.pricingRule.update({
      where: { id },
      data: data as Parameters<typeof prisma.pricingRule.update>[0]['data'],
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOwnerCtx();
    const { id } = await params;
    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    assertOrgAccess(existing.orgId, ctx.orgId);
    await prisma.pricingRule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw e;
  }
}
