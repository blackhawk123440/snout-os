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
    const row = await prisma.discount.findUnique({ where: { id } });
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
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    assertOrgAccess(existing.orgId, ctx.orgId);
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim() || existing.name;
    if (body.code !== undefined) data.code = body.code === '' || body.code == null ? null : String(body.code).trim();
    if (body.type !== undefined) data.type = String(body.type);
    if (body.value !== undefined) data.value = Number(body.value);
    if (body.valueType !== undefined) data.valueType = body.valueType === 'fixed' ? 'fixed' : 'percentage';
    if (body.minBookingTotal !== undefined) data.minBookingTotal = body.minBookingTotal == null ? null : Number(body.minBookingTotal);
    if (body.maxDiscount !== undefined) data.maxDiscount = body.maxDiscount == null ? null : Number(body.maxDiscount);
    if (body.validFrom !== undefined) data.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validUntil !== undefined) data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.usageLimit !== undefined) data.usageLimit = body.usageLimit == null ? null : Number(body.usageLimit);
    if (body.conditions !== undefined) data.conditions = body.conditions == null ? null : (typeof body.conditions === 'string' ? body.conditions : JSON.stringify(body.conditions));
    if (body.enabled !== undefined) data.enabled = body.enabled === true;
    const updated = await prisma.discount.update({
      where: { id },
      data: data as Parameters<typeof prisma.discount.update>[0]['data'],
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
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    assertOrgAccess(existing.orgId, ctx.orgId);
    await prisma.discount.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw e;
  }
}
