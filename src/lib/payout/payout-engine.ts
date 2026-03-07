/**
 * Payout calculation and execution.
 * Uses sitter commission split; creates Stripe transfer and persists PayoutTransfer.
 */

import type { PrismaClient } from "@prisma/client";
import { createTransferToConnectedAccount } from "@/lib/stripe-connect";
import { logEvent } from "@/lib/log-event";
import { upsertLedgerEntry } from "@/lib/finance/ledger";

export interface PayoutCalculation {
  amountCents: number;
  amountGross: number;
  commissionPct: number;
  netAmount: number;
}

/**
 * Calculate sitter payout for a completed booking.
 * Uses sitter commissionPercentage (default 80%).
 */
export function calculatePayoutForBooking(
  totalPrice: number,
  commissionPercentage: number = 80
): PayoutCalculation {
  const pct = Math.min(100, Math.max(0, commissionPercentage));
  const netAmount = (totalPrice * pct) / 100;
  const amountCents = Math.round(netAmount * 100);
  return {
    amountCents,
    amountGross: totalPrice,
    commissionPct: pct,
    netAmount,
  };
}

/**
 * Execute payout: create Stripe transfer and persist PayoutTransfer.
 * Idempotent: skips if PayoutTransfer already exists for this booking.
 */
export async function executePayout(params: {
  db: PrismaClient;
  orgId: string;
  sitterId: string;
  bookingId: string;
  amountCents: number;
  currency?: string;
}): Promise<{ success: boolean; transferId?: string; payoutTransferId?: string; error?: string }> {
  const { db, orgId, sitterId, bookingId, amountCents, currency = "usd" } = params;

  const existing = await db.payoutTransfer.findFirst({
    where: { orgId, bookingId, sitterId },
  });
  if (existing) {
    return {
      success: existing.status === "paid",
      transferId: existing.stripeTransferId ?? undefined,
      payoutTransferId: existing.id,
      error: existing.status === "failed" ? existing.lastError ?? undefined : undefined,
    };
  }

  const account = await db.sitterStripeAccount.findFirst({
    where: { orgId, sitterId },
  });
  if (!account?.accountId || !account.payoutsEnabled) {
    const pt = await db.payoutTransfer.create({
      data: {
        orgId,
        sitterId,
        bookingId,
        amount: amountCents,
        currency,
        status: "failed",
        lastError: "Sitter has no connected Stripe account or payouts not enabled",
      },
    });
    await upsertLedgerEntry(db, {
      orgId,
      entryType: "payout",
      source: "stripe",
      sitterId,
      bookingId,
      amountCents,
      currency,
      status: "failed",
      occurredAt: pt.createdAt,
    });
    await logEvent({
      action: "payout.failed",
      orgId,
      metadata: {
        sitterId,
        bookingId,
        reason: "no_connected_account",
      },
    }).catch(() => {});
    return { success: false, error: "Sitter has no connected Stripe account" };
  }

  try {
    const { transferId } = await createTransferToConnectedAccount({
      amountCents,
      currency,
      destinationAccountId: account.accountId,
      description: `Payout for booking ${bookingId}`,
      metadata: { orgId, sitterId, bookingId },
    });

    const pt = await db.payoutTransfer.create({
      data: {
        orgId,
        sitterId,
        bookingId,
        stripeTransferId: transferId,
        amount: amountCents,
        currency,
        status: "paid",
      },
    });
    await upsertLedgerEntry(db, {
      orgId,
      entryType: "payout",
      source: "stripe",
      stripeId: transferId,
      sitterId,
      bookingId,
      amountCents,
      currency,
      status: "succeeded",
      occurredAt: pt.createdAt,
    });

    await logEvent({
      action: "payout.sent",
      orgId,
      metadata: {
        sitterId,
        bookingId,
        transferId,
        amountCents,
      },
    }).catch(() => {});

    return { success: true, transferId, payoutTransferId: pt.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const pt = await db.payoutTransfer.create({
      data: {
        orgId,
        sitterId,
        bookingId,
        amount: amountCents,
        currency,
        status: "failed",
        lastError: msg,
      },
    });
    await upsertLedgerEntry(db, {
      orgId,
      entryType: "payout",
      source: "stripe",
      sitterId,
      bookingId,
      amountCents,
      currency,
      status: "failed",
      occurredAt: pt.createdAt,
    });
    await logEvent({
      action: "payout.failed",
      orgId,
      metadata: {
        sitterId,
        bookingId,
        error: msg,
      },
    }).catch(() => {});
    return { success: false, error: msg };
  }
}
