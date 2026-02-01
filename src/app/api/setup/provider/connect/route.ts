/**
 * Connect Provider (Save Credentials)
 * POST /api/setup/provider/connect
 * 
 * Encrypts and persists Twilio credentials to database.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/messaging/encryption";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);
    const body = await request.json();
    const { accountSid, authToken } = body;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Account SID and Auth Token are required" },
        { status: 400 }
      );
    }

    // Validate format
    if (!accountSid.startsWith('AC') && !accountSid.startsWith('TEST_')) {
      return NextResponse.json(
        { error: "Invalid Account SID format" },
        { status: 400 }
      );
    }

    // Test connection before saving
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      await client.api.accounts(accountSid).fetch();
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message || "Failed to connect to Twilio",
      }, { status: 400 });
    }

    // Encrypt credentials
    const configJson = JSON.stringify({ accountSid, authToken });
    const encryptedConfig = encrypt(configJson);

    // Upsert credentials in database
    await prisma.providerCredential.upsert({
      where: { orgId },
      update: {
        providerType: 'twilio',
        encryptedConfig,
        updatedAt: new Date(),
      },
      create: {
        orgId,
        providerType: 'twilio',
        encryptedConfig,
      },
    });

    // Create audit event
    await prisma.eventLog.create({
      data: {
        eventType: 'provider.credentials.connected',
        status: 'success',
        metadata: JSON.stringify({
          providerType: 'twilio',
          accountSid: `${accountSid.substring(0, 4)}...`, // Masked for audit
          updatedBy: currentUser.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Provider connected and credentials saved successfully.",
    });
  } catch (error: any) {
    console.error("[setup/provider/connect] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
