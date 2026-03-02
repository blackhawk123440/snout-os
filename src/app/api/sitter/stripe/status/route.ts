/**
 * GET /api/sitter/stripe/status
 * Returns Stripe Connect onboarding status for current sitter.
 */

import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { getScopedDb } from "@/lib/tenancy";

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, "sitter");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ctx?.sitterId) {
    return NextResponse.json({ error: "Sitter profile missing" }, { status: 403 });
  }

  const db = getScopedDb(ctx);

  try {
    const account = await db.sitterStripeAccount.findFirst({
      where: { sitterId: ctx.sitterId },
    });

    if (!account) {
      return NextResponse.json({
        connected: false,
        onboardingStatus: "pending",
        payoutsEnabled: false,
        chargesEnabled: false,
      });
    }

    return NextResponse.json({
      connected: true,
      accountId: account.accountId,
      onboardingStatus: account.onboardingStatus,
      payoutsEnabled: account.payoutsEnabled,
      chargesEnabled: account.chargesEnabled,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load status", message: msg },
      { status: 500 }
    );
  }
}
