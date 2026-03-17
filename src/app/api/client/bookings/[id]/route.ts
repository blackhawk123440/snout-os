import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(
  _request: NextRequest,
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
    const booking = await (prisma as any).booking.findFirst({
      where: whereOrg(ctx.orgId, { id, clientId: ctx.clientId }),
      include: {
        pets: { select: { id: true, name: true, species: true } },
        sitter: { select: { firstName: true, lastName: true, currentTierId: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const paidCharge = await (prisma as any).stripeCharge.findFirst({
      where: {
        orgId: ctx.orgId,
        bookingId: booking.id,
        status: 'succeeded',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        currency: true,
        paymentIntentId: true,
      },
    });

    // Resolve sitter tier name
    let sitterInfo: { name: string; tier: string | null } | null = null;
    if (booking.sitter) {
      let tierName: string | null = null;
      if (booking.sitter.currentTierId) {
        const tier = await (prisma as any).sitterTier.findUnique({
          where: { id: booking.sitter.currentTierId },
          select: { name: true },
        });
        tierName = tier?.name ?? null;
      }
      sitterInfo = {
        name: `${booking.sitter.firstName} ${booking.sitter.lastName}`.trim(),
        tier: tierName,
      };
    }

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    return NextResponse.json({
      id: booking.id,
      service: booking.service,
      startAt: toIso(booking.startAt),
      endAt: toIso(booking.endAt),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPrice: Number(booking.totalPrice),
      address: booking.address,
      pets: (booking.pets || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        species: p.species,
      })),
      sitter: sitterInfo,
      paymentProof: paidCharge
        ? {
            status: 'paid',
            amount: Number(paidCharge.amount) / 100,
            paidAt: toIso(paidCharge.createdAt),
            bookingReference: booking.id,
            invoiceReference: paidCharge.id,
            paymentIntentId: paidCharge.paymentIntentId ?? null,
            currency: paidCharge.currency || 'usd',
            receiptLink: null,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load booking', message },
      { status: 500 }
    );
  }
}
