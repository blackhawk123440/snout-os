/**
 * Connect Provider (Save Credentials)
 * POST /api/setup/provider/connect
 * 
 * NOTE: In production, credentials should be encrypted at rest.
 * For now, we validate and store in environment or secure storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // NOTE: In a real implementation, you would:
    // 1. Encrypt credentials using ENCRYPTION_KEY
    // 2. Store in database (Organization table) or secure vault
    // 3. Never log or return credentials
    
    // For now, we validate the connection and return success
    // The actual credentials should be set via environment variables
    // or a secure credential management system
    
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      await client.api.accounts(accountSid).fetch();
      
      // In production: Store encrypted credentials
      // await prisma.organization.update({
      //   where: { id: orgId },
      //   data: {
      //     providerType: 'twilio',
      //     providerConfig: encrypt({ accountSid, authToken }),
      //   },
      // });

      return NextResponse.json({
        success: true,
        message: "Provider connected successfully. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your environment variables.",
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
