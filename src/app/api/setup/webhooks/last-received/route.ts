/**
 * Get Last Webhook Received Timestamp
 * GET /api/setup/webhooks/last-received
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

    // Get most recent message event (inbound) as proxy for last webhook
    const lastMessage = await prisma.messageEvent.findFirst({
      where: {
        orgId,
        direction: 'inbound',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    return NextResponse.json({
      lastReceivedAt: lastMessage?.createdAt.toISOString() || null,
      receiving: lastMessage ? (Date.now() - lastMessage.createdAt.getTime()) < 5 * 60 * 1000 : false, // Active if within 5 minutes
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
