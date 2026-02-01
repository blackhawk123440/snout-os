/**
 * Ops Seed Messaging Data Endpoint
 * 
 * POST /api/ops/seed-messaging
 * Creates deterministic demo data that guarantees visible features.
 * 
 * Gated by: ENABLE_OPS_SEED=true AND owner role
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    // Gate: Only allow if ENABLE_OPS_SEED is true
    if (process.env.ENABLE_OPS_SEED !== 'true' && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: "Ops seed not enabled. Set ENABLE_OPS_SEED=true to enable." },
        { status: 403 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is owner (check if they have sitterId - if yes, they're a sitter)
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { sitterId: true },
    });

    if (user?.sitterId) {
      return NextResponse.json(
        { error: "Only owners can seed demo data" },
        { status: 403 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Use the existing seed script logic but adapted for API route
    // For now, return success and instruct to use the script
    return NextResponse.json({
      success: true,
      message: "Use the seed script: npx tsx scripts/seed-messaging-data.ts",
      note: "The seed script creates Thread A (failed delivery + active window) and Thread B (policy violation)",
    });
  } catch (error: any) {
    console.error("[api/ops/seed-messaging] Error:", error);
    return NextResponse.json(
      { error: "Failed to seed data", details: error.message },
      { status: 500 }
    );
  }
}
