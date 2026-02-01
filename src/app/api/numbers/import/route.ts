/**
 * Import Number
 * POST /api/numbers/import
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);
    const body = await request.json();

    const { e164, numberSid, class: numberClass } = body;

    if (!e164 && !numberSid) {
      return NextResponse.json(
        { error: "Either e164 or numberSid is required" },
        { status: 400 }
      );
    }

    if (!numberClass || !['front_desk', 'sitter', 'pool'].includes(numberClass)) {
      return NextResponse.json(
        { error: "Invalid number class. Must be front_desk, sitter, or pool" },
        { status: 400 }
      );
    }

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 400 }
      );
    }

    try {
      const twilio = require('twilio');
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

      let phoneNumber;
      let actualE164: string;
      let actualSid: string;

      if (numberSid) {
        // Fetch by SID
        phoneNumber = await client.incomingPhoneNumbers(numberSid).fetch();
        actualE164 = phoneNumber.phoneNumber;
        actualSid = phoneNumber.sid;
      } else {
        // Search by E164
        const numbers = await client.incomingPhoneNumbers.list({
          phoneNumber: e164,
        });
        
        if (numbers.length === 0) {
          return NextResponse.json(
            { error: "Number not found in your Twilio account" },
            { status: 404 }
          );
        }
        
        phoneNumber = numbers[0];
        actualE164 = phoneNumber.phoneNumber;
        actualSid = phoneNumber.sid;
      }

      // Check if number already exists
      const existing = await prisma.messageNumber.findFirst({
        where: {
          OR: [
            { e164: actualE164, orgId },
            { providerNumberSid: actualSid, orgId },
          ],
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Number already imported" },
          { status: 409 }
        );
      }

      // Create number record
      const number = await prisma.messageNumber.create({
        data: {
          orgId,
          e164: actualE164,
          numberClass: numberClass as 'front_desk' | 'sitter' | 'pool',
          status: 'active',
          providerType: 'twilio',
          providerNumberSid: actualSid,
          purchaseDate: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        number: {
          id: number.id,
          e164: number.e164,
          numberSid: actualSid,
        },
      });
    } catch (error: any) {
      console.error("[numbers/import] Error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to import number" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[numbers/import] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
