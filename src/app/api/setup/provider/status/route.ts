/**
 * Get Provider Status
 * GET /api/setup/provider/status
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

    const hasCredentials = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
    
    return NextResponse.json({
      connected: hasCredentials,
      providerType: hasCredentials ? 'twilio' : 'none',
      accountSid: env.TWILIO_ACCOUNT_SID ? `${env.TWILIO_ACCOUNT_SID.substring(0, 4)}...` : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
