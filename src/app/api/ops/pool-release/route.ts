/**
 * Pool Release Job Endpoint
 * 
 * POST /api/ops/pool-release
 * 
 * Manually trigger pool release job (for testing or manual runs).
 * In production, this should be called by a cron job.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
import { releasePoolNumbers } from "@/lib/messaging/pool-release-job";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Owner-only endpoint
    const sitterId = await getCurrentSitterId(request);
    if (sitterId) {
      return NextResponse.json(
        { error: "Access denied: Pool release job is owner-only" },
        { status: 403 }
      );
    }

    // Get orgId from context (optional - if not provided, runs for all orgs)
    const { orgId } = await request.json().catch(() => ({}));

    // Run pool release job
    const stats = await releasePoolNumbers(orgId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[api/ops/pool-release] Error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
