import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';
import { stripe } from '@/lib/stripe';
import { logEvent } from '@/lib/log-event';

const RefundSchema = z.object({
  amount: z.number().min(0.01).optional(), // partial refund amount in dollars; full if omitted
});

export async function POST(
  request: NextRequest,
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

  const { id: bookingId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = RefundSchema.safeParse(body);
    const requestedAmount = parsed.success ? parsed.data.amount : undefined;

    const db = getScopedDb(ctx);
    const booking = await db.booking.findFirst({
      where: { id: bookingId },
      select: { id: true, totalPrice: true, paymentStatus: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Find the Stripe charge
    const charge = await db.stripeCharge.findFirst({
      where: { bookingId, status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, paymentIntentId: true },
    });
    if (!charge || !charge.paymentIntentId) {
      return NextResponse.json({ error: 'No Stripe payment found for this booking' }, { status: 400 });
    }

    const maxRefundDollars = charge.amount / 100;
    const refundDollars = requestedAmount ? Math.min(requestedAmount, maxRefundDollars) : maxRefundDollars;
    const refundCents = Math.round(refundDollars * 100);

    if (refundCents <= 0) {
      return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 });
    }

    // Process refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: charge.paymentIntentId,
      amount: refundCents,
      reason: 'requested_by_customer',
    });

    // Record in DB
    await db.stripeRefund.create({
      data: {
        id: refund.id,
        chargeId: charge.id,
        amount: refundCents,
        currency: 'usd',
        reason: 'requested_by_customer',
        status: refund.status || 'succeeded',
        paymentIntentId: charge.paymentIntentId,
        createdAt: new Date(),
      },
    });

    // Ledger entry
    await db.ledgerEntry.create({
      data: {
        orgId: ctx.orgId,
        entryType: 'refund',
        source: 'stripe',
        stripeId: refund.id,
        bookingId,
        amountCents: refundCents,
        status: 'succeeded',
        occurredAt: new Date(),
      },
    });

    // Update booking payment status
    const isFullRefund = refundCents >= charge.amount;
    await db.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: isFullRefund ? 'refunded' : 'partial_refund' },
    });

    await logEvent({
      orgId: ctx.orgId,
      action: 'payment.refunded',
      bookingId,
      status: 'success',
      metadata: { refundId: refund.id, amount: refundDollars, full: isFullRefund },
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refundDollars,
      full: isFullRefund,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Refund failed', message }, { status: 500 });
  }
}
