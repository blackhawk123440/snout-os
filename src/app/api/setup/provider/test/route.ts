/**
 * Test Twilio Connection
 * POST /api/setup/provider/test
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const accountSid = body.accountSid || env.TWILIO_ACCOUNT_SID;
    const authToken = body.authToken || env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: "Account SID and Auth Token are required" },
        { status: 400 }
      );
    }

    // Test connection by creating a Twilio client and fetching account info
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      const account = await client.api.accounts(accountSid).fetch();
      
      return NextResponse.json({
        success: true,
        accountName: account.friendlyName || accountSid,
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message || "Failed to connect to Twilio",
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
