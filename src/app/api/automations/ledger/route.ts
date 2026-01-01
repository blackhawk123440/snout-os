/**
 * Automation Run Ledger API
 * 
 * Master Spec Reference: Line 257 (Phase 3)
 * "Add an automation run ledger page that shows last runs and failures"
 * 
 * API endpoint to fetch automation run history for the ledger page.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status"); // Filter by status (success, failed, skipped)
    const automationType = searchParams.get("automationType"); // Filter by automation type

    // Build where clause
    const where: any = {
      eventType: "automation.run",
    };

    if (status) {
      where.status = status;
    }

    if (automationType) {
      where.automationType = automationType;
    }

    // Fetch automation runs
    const [runs, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
        include: {
          booking: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              service: true,
              status: true,
            },
          },
        },
      }),
      prisma.eventLog.count({ where }),
    ]);

    // Parse metadata JSON strings
    const runsWithParsedMetadata = runs.map((run) => ({
      ...run,
      metadata: run.metadata ? JSON.parse(run.metadata) : null,
    }));

    return NextResponse.json({
      runs: runsWithParsedMetadata,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch automation runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation runs" },
      { status: 500 }
    );
  }
}

