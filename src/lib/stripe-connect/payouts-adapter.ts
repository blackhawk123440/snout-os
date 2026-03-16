/**
 * Stripe Connect payouts adapter scaffold.
 *
 * Safety guarantees:
 * - Disabled by default behind ENABLE_STRIPE_CONNECT_PAYOUTS
 * - No live transfer/payout execution in this module
 * - Structured for future schema-aligned implementation
 */

import { resolveCorrelationId } from "@/lib/correlation-id";
import { ENABLE_STRIPE_CONNECT_PAYOUTS } from "@/lib/flags";

export interface StripeConnectPayoutRequest {
  orgId: string;
  sitterId: string;
  bookingId?: string;
  amountCents: number;
  allowLiveExecution?: boolean;
  correlationId?: string;
}

export interface StripeConnectPayoutAdapterResult {
  accepted: boolean;
  status: "disabled" | "dry_run_only" | "rejected_live_execution";
  correlationId: string;
  reason: string;
  preview: {
    orgId: string;
    sitterId: string;
    bookingId?: string;
    amountCents: number;
  };
}

export interface StripeConnectPayoutAdapterDeps {
  enabled?: boolean;
  observe?: (eventName: string, payload: Record<string, unknown>) => Promise<void> | void;
}

export async function requestStripeConnectPayout(
  request: StripeConnectPayoutRequest,
  deps: StripeConnectPayoutAdapterDeps = {}
): Promise<StripeConnectPayoutAdapterResult> {
  const correlationId = resolveCorrelationId(undefined, request.correlationId);
  const enabled = deps.enabled ?? ENABLE_STRIPE_CONNECT_PAYOUTS;

  const preview = {
    orgId: request.orgId,
    sitterId: request.sitterId,
    bookingId: request.bookingId,
    amountCents: request.amountCents,
  };

  if (!enabled) {
    await deps.observe?.("payout.adapter.skipped", {
      ...preview,
      reason: "flag_disabled",
      correlationId,
    });
    return {
      accepted: false,
      status: "disabled",
      correlationId,
      reason: "ENABLE_STRIPE_CONNECT_PAYOUTS is disabled",
      preview,
    };
  }

  // Safety-first: explicit live execution stays blocked until schema/state lifecycle is finalized.
  if (request.allowLiveExecution) {
    await deps.observe?.("payout.adapter.rejected_live_execution", {
      ...preview,
      correlationId,
    });
    return {
      accepted: false,
      status: "rejected_live_execution",
      correlationId,
      reason: "Live Stripe Connect payout execution is intentionally blocked in scaffold adapter",
      preview,
    };
  }

  await deps.observe?.("payout.adapter.dry_run", {
    ...preview,
    correlationId,
  });

  return {
    accepted: true,
    status: "dry_run_only",
    correlationId,
    reason: "Adapter scaffold accepted request in dry-run mode only",
    preview,
  };
}

/**
 * TODO(schema-alignment):
 * - Map SitterStripeAccount lifecycle:
 *   current schema uses accountId/onboardingStatus/payoutsEnabled/chargesEnabled.
 * - Align payout statuses with PayoutTransfer.status vocabulary.
 * - Define transfer->ledger reconciliation mapping for partial failures/retries.
 * - Add org-scoped authorization adapter for owner/admin/sitter boundaries before live enablement.
 */
