import { NextRequest, NextResponse } from "next/server";
import { calculateAllSitterTiers, calculateSitterTier } from "@/lib/tier-engine";

/**
 * POST /api/sitter-tiers/calculate
 * Calculate tiers for all sitters or a specific sitter
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sitterId, periodStart, periodEnd } = body;

    // Default to last month if not specified
    const end = periodEnd ? new Date(periodEnd) : new Date();
    const start = periodStart ? new Date(periodStart) : new Date(end.getFullYear(), end.getMonth() - 1, 1);

    if (sitterId) {
      // Calculate for specific sitter
      const result = await calculateSitterTier(sitterId, start, end);
      
      if (!result) {
        return NextResponse.json(
          { error: "Sitter not found or tier calculation failed" },
          { status: 404 }
        );
      }

      return NextResponse.json({ result });
    } else {
      // Calculate for all sitters
      const results = await calculateAllSitterTiers(start, end);
      
      return NextResponse.json({
        results,
        count: results.length,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      });
    }
  } catch (error: any) {
    console.error("Failed to calculate sitter tiers:", error);
    return NextResponse.json(
      { error: "Failed to calculate sitter tiers" },
      { status: 500 }
    );
  }
}



