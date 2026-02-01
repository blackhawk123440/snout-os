/**
 * System Readiness Check
 * GET /api/setup/readiness
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    const checks = [];

    // Check 1: Provider connected
    const hasProvider = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
    checks.push({
      name: "Provider Connected",
      passed: hasProvider,
      error: hasProvider ? undefined : "Twilio credentials not configured",
    });

    // Check 2: Front Desk number exists
    const frontDeskCount = await prisma.messageNumber.count({
      where: { orgId, numberClass: 'front_desk', status: 'active' },
    });
    checks.push({
      name: "Front Desk Number",
      passed: frontDeskCount > 0,
      error: frontDeskCount === 0 ? "No front desk number configured" : undefined,
    });

    // Check 3: Webhook URL configured
    const hasWebhookUrl = !!env.TWILIO_WEBHOOK_URL || !!env.WEBHOOK_BASE_URL;
    checks.push({
      name: "Webhook URL Configured",
      passed: hasWebhookUrl,
      error: hasWebhookUrl ? undefined : "Webhook URL not configured",
    });

    const allPassed = checks.every(c => c.passed);

    return NextResponse.json({
      ready: allPassed,
      checks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
