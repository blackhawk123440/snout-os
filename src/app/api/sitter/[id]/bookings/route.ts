/**
 * Sitter Bookings API (Phase 5.1)
 * 
 * Returns bookings assigned to a sitter with limited client data.
 * Per Master Spec 7.1.1: Sitters can see only their assigned bookings and limited client data.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSitterId, requireSitter, limitClientDataForSitter } from "@/lib/sitter-helpers";
import { env } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Phase 5.1: If sitter auth is enabled, verify the authenticated sitter matches the requested ID
    const enableSitterAuth = env.ENABLE_SITTER_AUTH === true;
    
    if (enableSitterAuth) {
      const currentSitterId = await getCurrentSitterId(request);
      if (!currentSitterId || currentSitterId !== id) {
        return NextResponse.json(
          { error: "Unauthorized: You can only access your own bookings" },
          { status: 403 }
        );
      }
    }

    const sitter = await prisma.sitter.findUnique({
      where: { id },
      include: {
        currentTier: true,
      },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Get bookings for this sitter (already scoped by sitterId)
    const bookings = await prisma.booking.findMany({
      where: { sitterId: id },
      include: {
        pets: true,
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    // Phase 5.1: Limit client data per Master Spec 7.1.1
    // Only return data required for sitter to do the job
    const limitedBookings = bookings.map(limitClientDataForSitter);

    return NextResponse.json({ 
      bookings: limitedBookings,
      sitter: {
        id: sitter.id,
        firstName: sitter.firstName,
        lastName: sitter.lastName,
        commissionPercentage: sitter.commissionPercentage || 80.0,
        currentTier: sitter.currentTier ? {
          id: sitter.currentTier.id,
          name: sitter.currentTier.name,
          priorityLevel: sitter.currentTier.priorityLevel,
          badgeColor: sitter.currentTier.badgeColor,
          badgeStyle: sitter.currentTier.badgeStyle,
          description: sitter.currentTier.description,
          commissionSplit: sitter.currentTier.commissionSplit,
          // Include permission fields for dashboard display
          canJoinPools: sitter.currentTier.canJoinPools,
          canAutoAssign: sitter.currentTier.canAutoAssign,
          canOvernight: sitter.currentTier.canOvernight,
          canSameDay: sitter.currentTier.canSameDay,
          canHighValue: sitter.currentTier.canHighValue,
          canRecurring: sitter.currentTier.canRecurring,
          canLeadPool: sitter.currentTier.canLeadPool,
        } : null,
      }
    });
  } catch (error) {
    console.error("Failed to fetch sitter bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}