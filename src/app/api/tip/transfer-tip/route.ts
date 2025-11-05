import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Only transfer if enabled
    if (String(process.env.ENABLE_TRANSFERS).toLowerCase() !== 'true') {
      return NextResponse.json({ status: 'skipped', reason: 'transfers_disabled' });
    }

    const body = await request.json();
    const paymentIntentId = String(body.paymentIntentId || '');
    const sitterId = String(body.sitterId || '');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: { message: 'Missing paymentIntentId' } },
        { status: 400 }
      );
    }
    if (!sitterId || !sitterId.startsWith('acct_')) {
      return NextResponse.json(
        { error: { message: 'Invalid sitterId. Expected acct_...' } },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges'],
    }) as any;

    const charge = paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data[0]
      ? paymentIntent.charges.data[0]
      : null;

    let tipCents = 0;
    if (paymentIntent.metadata && paymentIntent.metadata.tip_amount) {
      const dollars = Number(paymentIntent.metadata.tip_amount);
      if (!isNaN(dollars)) tipCents = Math.round(dollars * 100);
    }
    if (!tipCents) tipCents = paymentIntent.amount;

    if (!charge || !charge.id) {
      return NextResponse.json(
        { error: { message: 'Charge not found for Payment Intent' } },
        { status: 400 }
      );
    }

    const transfer = await stripe.transfers.create({
      amount: tipCents,
      currency: paymentIntent.currency || 'usd',
      destination: sitterId,
      description: `Tip transfer for sitter ${sitterId}`,
      source_transaction: charge.id,
    });

    return NextResponse.json({ status: 'ok', transfer });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 }
    );
  }
}

