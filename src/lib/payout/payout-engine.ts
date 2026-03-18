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
  correlationId?: string;
}): Promise<{ success: boolean; transferId?: string; payoutTransferId?: string; error?: string }> {
  const { db, orgId, sitterId, bookingId, amountCents, currency = "usd", correlationId } = params;

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
      correlationId,
      metadata: {
        sitterId,
        bookingId,
        reason: "no_connected_account",
      },
    }).catch(() => {});
    return { success: false, error: "Sitter has no connected Stripe account" };
  }

  try {
    const metadata: Record<string, string> = { orgId, sitterId, bookingId };
    if (correlationId) metadata.correlationId = correlationId;
    const { transferId } = await createTransferToConnectedAccount({
      amountCents,
      currency,
      destinationAccountId: account.accountId,
      description: `Payout for booking ${bookingId}`,
      metadata,
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

    // Create SitterEarning record for earnings tracking
    const grossAmount = amountCents / 100;
    const platformFee = grossAmount * 0.2; // 20% platform fee (inverse of 80% commission)
    await db.sitterEarning.upsert({
      where: {
        orgId_sitterId_bookingId: { orgId, sitterId, bookingId },
      },
      create: {
        orgId,
        sitterId,
        bookingId,
        amountGross: grossAmount,
        platformFee,
        netAmount: grossAmount - platformFee,
      },
      update: {
        amountGross: grossAmount,
        platformFee,
        netAmount: grossAmount - platformFee,
      },
    }).catch((e) => console.error("[payout] SitterEarning upsert failed:", e));

    await logEvent({
      action: "payout.sent",
      orgId,
      correlationId,
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
      correlationId,
      metadata: {
        sitterId,
        bookingId,
        error: msg,
      },
    }).catch(() => {});
    return { success: false, error: msg };
  }
}
