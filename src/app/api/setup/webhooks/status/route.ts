/**
 * Get Webhook Status
 * GET /api/setup/webhooks/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = env.TWILIO_WEBHOOK_URL || `${env.WEBHOOK_BASE_URL}/api/messages/webhook/twilio`;
    
    return NextResponse.json({
      verified: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
      webhookUrl: webhookUrl,
      configured: !!env.TWILIO_WEBHOOK_URL,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
