import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || 'usd');
    const meta = body.metadata || {};
    
    const idempotencyKey = request.headers.get('x-idempotency-key') || undefined;

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: { message: 'Amount must be integer cents greater than zero' } },
        { status: 400 }
      );
    }
    if (amount > 1000000) {
      return NextResponse.json(
        { error: { message: 'Amount too large' } },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        sitter_id: String(meta.sitter_id || ''),
        tip_amount: String(meta.tip_amount || ''),
        payer_name: String(meta.payer_name || ''),
      },
    }, idempotencyKey ? { idempotencyKey } : {});

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 400 }
    );
  }
}

