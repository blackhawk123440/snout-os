/**
 * Pool Release Job Endpoint
 * 
 * POST /api/ops/pool-release
 * 
 * Manually trigger pool release job (for testing or manual runs).
 * In production, this should be called by a cron job.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-helpers";
import { releasePoolNumbers } from "@/lib/messaging/pool-release-job";

export async function POST(request: NextRequest) {
  try {
    // Owner-only endpoint
    try {
      await requireOwner(request);
    } catch (error: any) {
      if (error.name === 'OwnerAuthError') {
        return NextResponse.json(
          { error: error.message || "Access denied: Owner authentication required" },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
