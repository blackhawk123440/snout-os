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
      include: { pets: { select: { id: true, name: true, species: true } } },
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
