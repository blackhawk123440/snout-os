/**
 * Install Webhooks
 * POST /api/setup/webhooks/install
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Twilio credentials not configured" },
        { status: 400 }
      );
    }

    const webhookUrl = env.TWILIO_WEBHOOK_URL || `${env.WEBHOOK_BASE_URL}/api/messages/webhook/twilio`;

    // Get all active numbers
    const numbers = await prisma.messageNumber.findMany({
      where: { orgId, status: 'active' },
      select: { id: true, e164: true, providerNumberSid: true },
    });

    if (numbers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active numbers found. Please configure numbers first." },
        { status: 400 }
      );
    }

    const twilioProvider = new TwilioProvider();
    let successCount = 0;
    let failCount = 0;

    // Configure webhooks for each number
    for (const number of numbers) {
      if (number.providerNumberSid) {
        try {
          const twilio = require('twilio');
          const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
          
          await client.incomingPhoneNumbers(number.providerNumberSid).update({
            smsUrl: webhookUrl,
            statusCallback: webhookUrl,
          });
          
          successCount++;
        } catch (error: any) {
          console.error(`[webhooks/install] Failed to configure webhook for ${number.e164}:`, error);
          failCount++;
        }
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to install webhooks for any numbers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      configured: successCount,
      failed: failCount,
      message: `Webhooks installed for ${successCount} number(s)`,
    });
  } catch (error: any) {
    console.error("[webhooks/install] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
