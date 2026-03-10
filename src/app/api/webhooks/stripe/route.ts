/**
 * Stripe Webhook Handler
 *
 * Handles: payment_intent.succeeded, payment_intent.payment_failed,
 * charge.refunded, invoice.payment_succeeded.
 * Persists to StripeCharge/StripeRefund, logs payment.completed/failed/refunded.
 * Verifies webhook signature; rejects non-POST.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { getScopedDb } from '@/lib/tenancy';
import { onBookingConfirmed } from '@/lib/bookings/booking-confirmed-handler';
import { logEvent } from '@/lib/log-event';
import {
  persistPaymentSucceeded,
  persistPaymentFailed,
  persistRefund,
} from '@/lib/stripe-webhook-persist';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let event: Stripe.Event;
    if (env.ENABLE_WEBHOOK_VALIDATION) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
      }
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
      }
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_dummy', { apiVersion: '2023-10-16' });
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      } catch (err: any) {
        console.warn('[Stripe Webhook] Signature verification failed:', err?.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }


    // payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as any;
      const bookingId = pi.metadata?.bookingId;
      const orgId = pi.metadata?.orgId || 'default';
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
      const db = getScopedDb({ orgId });

      await persistPaymentSucceeded(
        db,
        pi.id,
        pi.amount,
        pi.currency || 'usd',
        orgId,
        bookingId,
        pi.receipt_email,
        null,
        chargeId || undefined
      );

      if (bookingId) {
        const booking = await db.booking.findUnique({
          where: { id: bookingId },
          select: { orgId: true, clientId: true, sitterId: true, startAt: true, endAt: true, status: true },
        });
        if (booking) {
          if (chargeId) {
            await db.stripeCharge.updateMany({
              where: { id: chargeId },
              data: { orgId: booking.orgId || orgId, clientId: booking.clientId },
            });
          }
          const previousStatus = booking.status || 'pending';
          if (previousStatus !== 'confirmed') {
            try {
              await onBookingConfirmed({
                bookingId,
                orgId: booking.orgId || orgId,
                clientId: booking.clientId || '',
                sitterId: booking.sitterId,
                startAt: new Date(booking.startAt),
                endAt: new Date(booking.endAt),
                actorUserId: 'system',
              });
              await db.booking.update({
                where: { id: bookingId },
                data: { status: 'confirmed', paymentStatus: 'paid' },
              });
            } catch (e: any) {
              console.error('[Stripe Webhook] onBookingConfirmed failed:', e);
            }
          }
          await logEvent({
            orgId: booking.orgId || orgId,
            actorUserId: 'system',
            action: 'payment.completed',
            entityType: 'payment',
            entityId: pi.id,
            bookingId,
            status: 'success',
            metadata: { stripeEventType: event.type },
          }).catch(() => {});
          const { enqueueAutomation } = await import('@/lib/automation-queue');
          await enqueueAutomation(
            'bookingConfirmation',
            'client',
            { bookingId },
            `bookingConfirmation:client:${bookingId}:payment`
          );
        }
      }
    }

    // payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as any;
      const err = pi.last_payment_error?.message || 'Payment failed';
      const orgId = pi.metadata?.orgId || 'default';
      const bookingId = pi.metadata?.bookingId;
      const db = getScopedDb({ orgId });
      await persistPaymentFailed(
        db,
        pi.id,
        pi.amount,
        pi.currency || 'usd',
        orgId,
        err,
        bookingId,
        pi.receipt_email
      );
    }

    // charge.refunded
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as any;
      const refunds = charge.refunds?.data || [];
      const orgId = charge.metadata?.orgId || 'default';
      const db = getScopedDb({ orgId });
      for (const r of refunds) {
        await persistRefund(
          db,
          r.id,
          charge.id,
          r.amount,
          r.currency || 'usd',
          r.status || 'succeeded',
          orgId,
          charge.payment_intent
        );
      }
    }

    // account.updated (Stripe Connect - update payoutsEnabled/chargesEnabled)
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      const accountId = account.id;
      const { prisma } = await import('@/lib/db');
      const existing = await (prisma as any).sitterStripeAccount.findFirst({
        where: { accountId },
      });
      if (existing) {
        const db = getScopedDb({ orgId: existing.orgId });
        await db.sitterStripeAccount.update({
          where: { id: existing.id },
          data: {
            payoutsEnabled: account.payouts_enabled ?? false,
            chargesEnabled: account.charges_enabled ?? false,
            onboardingStatus: account.details_submitted ? 'complete' : 'onboarding',
          },
        });
      }
    }

    // invoice.payment_succeeded (legacy)
    if (event.type === 'invoice.payment_succeeded') {
      const inv = event.data.object as any;
      const bookingId = inv.metadata?.bookingId;
      const orgId = inv.metadata?.orgId || 'default';
      const amount = inv.amount_paid || 0;
      const chargeId = typeof inv.charge === 'string' ? inv.charge : inv.charge?.id;
      const db = getScopedDb({ orgId });
      if (chargeId) {
        await persistPaymentSucceeded(
          db,
          inv.payment_intent || chargeId,
          amount,
          inv.currency || 'usd',
          orgId,
          bookingId,
          inv.customer_email,
          inv.customer_name,
          chargeId
        );
      }
      if (bookingId) {
        await logEvent({
          orgId,
          actorUserId: 'system',
          action: 'payment.completed',
          entityType: 'payment',
          entityId: inv.id,
          bookingId,
          status: 'success',
          metadata: { stripeEventType: event.type },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error.message },
      { status: 500 }
    );
  }
}
