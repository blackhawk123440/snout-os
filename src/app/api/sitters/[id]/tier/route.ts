/**
 * Sitter Tier Management API
 * 
 * Handles tier promotions and demotions with audit logging.
 * Enterprise Rule: All tier changes must be logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logTierChange } from "@/lib/tier-permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tierId, reason, changedBy } = body;

    if (!tierId) {
      return NextResponse.json(
        { error: "tierId is required" },
        { status: 400 }
      );
    }

    // Verify sitter exists
    const sitter = await prisma.sitter.findUnique({
      where: { id },
      include: { currentTier: true },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: "Sitter not found" },
        { status: 404 }
      );
    }

    // Verify tier exists
    const tier = await prisma.sitterTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404 }
      );
    }

    const previousTierId = sitter.currentTierId;

    // Update sitter tier
    const updatedSitter = await prisma.sitter.update({
      where: { id },
      data: {
        currentTierId: tierId,
        // Update commission percentage based on tier
        commissionPercentage: tier.commissionSplit,
      },
      include: {
        currentTier: true,
      },
    });

    // Log tier change for audit trail
    await logTierChange(
      id,
      previousTierId || null,
      tierId,
      reason || (previousTierId ? "Tier changed" : "Initial tier assignment"),
      changedBy || null,
      {
        previousTierName: sitter.currentTier?.name || null,
        newTierName: tier.name,
      }
    );

    return NextResponse.json({
      sitter: updatedSitter,
      message: `Sitter tier updated from ${sitter.currentTier?.name || 'none'} to ${tier.name}`,
    });
  } catch (error: any) {
    console.error("Failed to update sitter tier:", error);
    return NextResponse.json(
      { error: "Failed to update sitter tier", details: error.message },
      { status: 500 }
    );
  }
}
