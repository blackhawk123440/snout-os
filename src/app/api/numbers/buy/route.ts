/**
 * Buy Number
 * POST /api/numbers/buy
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

    const { class: numberClass, areaCode, country = 'US', quantity = 1 } = body;

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

      // Search for available numbers
      const searchParams: any = {
        smsEnabled: true,
        limit: quantity,
      };
      
      if (areaCode) {
        searchParams.areaCode = areaCode;
      } else {
        searchParams.inRegion = country === 'US' ? 'US' : undefined;
      }

      const availableNumbers = await client.availablePhoneNumbers(country).local.list(searchParams);

      if (availableNumbers.length === 0) {
        return NextResponse.json(
          { error: "No available numbers found for the specified criteria" },
          { status: 404 }
        );
      }

      const purchasedNumbers = [];
      let totalCost = 0;

      for (const available of availableNumbers.slice(0, quantity)) {
        try {
          // Purchase the number
          const phoneNumber = await client.incomingPhoneNumbers.create({
            phoneNumber: available.phoneNumber,
          });

          // Create number record
          const number = await prisma.messageNumber.create({
            data: {
              orgId,
              e164: available.phoneNumber,
              numberClass: numberClass as 'front_desk' | 'sitter' | 'pool',
              status: 'active',
              providerType: 'twilio',
              providerNumberSid: phoneNumber.sid,
              purchaseDate: new Date(),
            },
          });

          // Estimate cost (typically $1/month per number)
          const cost = 1.0;
          totalCost += cost;

          purchasedNumbers.push({
            id: number.id,
            e164: number.e164,
            numberSid: phoneNumber.sid,
            cost,
          });
        } catch (error: any) {
          console.error(`[numbers/buy] Failed to purchase ${available.phoneNumber}:`, error);
          // Continue with other numbers
        }
      }

      if (purchasedNumbers.length === 0) {
        return NextResponse.json(
          { error: "Failed to purchase any numbers" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        numbers: purchasedNumbers,
        totalCost,
      });
    } catch (error: any) {
      console.error("[numbers/buy] Error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to purchase numbers" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[numbers/buy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
