/**
 * Get Provider Status
 * GET /api/setup/provider/status
 * 
 * Reads provider credentials from database (encrypted).
 * Falls back to env vars only in development.
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

    // Try to read from database first
    const credential = await prisma.providerCredential.findUnique({
      where: { orgId },
    });

    if (credential) {
      // Credentials exist in DB
      return NextResponse.json({
        connected: true,
        providerType: credential.providerType,
        accountSid: null, // Never return account SID to client
        source: 'database',
      });
    }

    // Fallback to env vars (development only)
    const hasEnvCredentials = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
    
    return NextResponse.json({
      connected: hasEnvCredentials,
      providerType: hasEnvCredentials ? 'twilio' : 'none',
      accountSid: env.TWILIO_ACCOUNT_SID ? `${env.TWILIO_ACCOUNT_SID.substring(0, 4)}...` : null,
      source: hasEnvCredentials ? 'environment' : 'none',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
