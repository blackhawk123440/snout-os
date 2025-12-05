import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatClientNameForSitter } from "@/lib/booking-utils";
import { calculateSitterPoints, calculateCompletionRate, calculateResponseRate } from "@/lib/tier-engine";

/**
 * GET /api/sitters/[id]/dashboard
 * Get comprehensive dashboard data for a sitter
 * Supports both sitter view and admin view (read-only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isAdminView = searchParams.get("admin") === "true";

    // Get sitter
    const sitter = await prisma.sitter.findUnique({
      where: { id },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Get all bookings assigned to this sitter
    const allDirectBookings = await prisma.booking.findMany({
      where: {
        sitterId: id,
      },
      include: {
        pets: true,
        timeSlots: {
          orderBy: { startAt: "asc" },
        },
        client: true,
      },
      orderBy: { startAt: "desc" },
    });

    // Separate active and archived bookings
    const directBookings = allDirectBookings.filter(b => b.status !== "cancelled" && b.status !== "completed");
    const archivedBookings = allDirectBookings.filter(b => b.status === "completed" || b.status === "cancelled");

    // Get all active sitter pool offers for this sitter
    // Parse sitterIds JSON to check if this sitter is in the pool
    const allPoolOffers = await prisma.sitterPoolOffer.findMany({
      where: {
        status: { in: ["active", "accepted", "expired"] },
      },
      include: {
        booking: {
          include: {
            pets: true,
            timeSlots: {
              orderBy: { startAt: "asc" },
            },
            client: true,
            sitter: true, // To see if someone else accepted
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter pool offers to only those for this sitter
    const poolOffers = allPoolOffers.filter((offer) => {
      // Check if sitterId matches
      if (offer.sitterId === id) return true;
      
      // Check if sitter is in sitterIds array
      if (offer.sitterIds) {
        try {
          const sitterIds = JSON.parse(offer.sitterIds);
          if (Array.isArray(sitterIds) && sitterIds.includes(id)) {
            return true;
          }
        } catch {
          // Invalid JSON, skip
        }
      }
      
      return false;
    });

    // Categorize jobs
    const now = new Date();

    // Direct assignments - already accepted
    const acceptedJobs = directBookings.map((booking) => ({
      id: booking.id,
      bookingId: booking.id,
      type: "direct" as const,
      status: "accepted" as const,
      clientName: formatClientNameForSitter(
        booking.firstName || booking.client?.firstName || "",
        booking.lastName || booking.client?.lastName || ""
      ),
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots,
      address: booking.address,
      pets: booking.pets,
      totalPrice: booking.totalPrice,
      notes: booking.notes,
      createdAt: booking.createdAt,
    }));

    // Pool offers that need response
    const needsResponseJobs = poolOffers
      .filter((offer) => {
        // Must be active
        if (offer.status !== "active") return false;
        
        // Must not be expired
        if (offer.expiresAt && new Date(offer.expiresAt) < now) return false;
        
        // Must not already be accepted by someone else
        if (offer.acceptedSitterId && offer.acceptedSitterId !== id) return false;
        
        // Must not have been accepted by this sitter yet
        const responses = JSON.parse(offer.responses || "[]");
        const hasAccepted = responses.some(
          (r: any) => r.sitterId === id && (r.response?.toLowerCase() === "yes" || r.response?.toLowerCase() === "accept" || r.response?.toLowerCase() === "y")
        );
        if (hasAccepted) return false;
        
        return true;
      })
      .map((offer) => ({
        id: offer.id,
        bookingId: offer.bookingId,
        type: "pool" as const,
        status: "needs_response" as const,
        poolOfferId: offer.id,
        clientName: formatClientNameForSitter(
          offer.booking.firstName || offer.booking.client?.firstName || "",
          offer.booking.lastName || offer.booking.client?.lastName || ""
        ),
        service: offer.booking.service,
        startAt: offer.booking.startAt,
        endAt: offer.booking.endAt,
        timeSlots: offer.booking.timeSlots,
        address: offer.booking.address,
        pets: offer.booking.pets,
        totalPrice: offer.booking.totalPrice,
        notes: offer.booking.notes,
        expiresAt: offer.expiresAt,
        message: offer.message,
        createdAt: offer.createdAt,
      }));

    // Pool offers that are too late or expired
    const tooLateJobs = poolOffers
      .filter((offer) => {
        // Expired offers
        if (offer.status === "expired") return true;
        if (offer.expiresAt && new Date(offer.expiresAt) < now && offer.status === "active") return true;
        
        // Accepted by someone else
        if (offer.acceptedSitterId && offer.acceptedSitterId !== id) return true;
        
        // Accepted by this sitter (should be in acceptedJobs via direct booking)
        const responses = JSON.parse(offer.responses || "[]");
        const hasAccepted = responses.some(
          (r: any) => r.sitterId === id && (r.response?.toLowerCase() === "yes" || r.response?.toLowerCase() === "accept" || r.response?.toLowerCase() === "y")
        );
        if (hasAccepted && offer.booking.sitterId === id) return false; // This is now a direct booking
        
        // If offer was accepted by this sitter, it should be in acceptedJobs
        if (hasAccepted) return false;
        
        return offer.status === "accepted" || offer.status === "expired";
      })
      .map((offer) => {
        let status: "too_late" | "expired" = "too_late";
        if (offer.status === "expired" || (offer.expiresAt && new Date(offer.expiresAt) < now)) {
          status = "expired";
        } else if (offer.acceptedSitterId && offer.acceptedSitterId !== id) {
          status = "too_late";
        }

        return {
          id: offer.id,
          bookingId: offer.bookingId,
          type: "pool" as const,
          status,
          poolOfferId: offer.id,
          clientName: formatClientNameForSitter(
            offer.booking.firstName || offer.booking.client?.firstName || "",
            offer.booking.lastName || offer.booking.client?.lastName || ""
          ),
          service: offer.booking.service,
          startAt: offer.booking.startAt,
          endAt: offer.booking.endAt,
          timeSlots: offer.booking.timeSlots,
          address: offer.booking.address,
          pets: offer.booking.pets,
          totalPrice: offer.booking.totalPrice,
          notes: offer.booking.notes,
          expiresAt: offer.expiresAt,
          acceptedSitterId: offer.acceptedSitterId,
          createdAt: offer.createdAt,
        };
      });

    // Also include pool jobs that this sitter accepted (they're now direct bookings)
    const acceptedPoolJobs = poolOffers
      .filter((offer) => {
        if (offer.acceptedSitterId !== id) return false;
        if (!offer.booking.sitterId || offer.booking.sitterId !== id) return false;
        // Make sure it's not already in acceptedJobs
        return !acceptedJobs.find((job) => job.bookingId === offer.bookingId);
      })
      .map((offer) => ({
        id: offer.booking.id,
        bookingId: offer.booking.id,
        type: "pool" as const,
        status: "accepted" as const,
        poolOfferId: offer.id,
        clientName: formatClientNameForSitter(
          offer.booking.firstName || offer.booking.client?.firstName || "",
          offer.booking.lastName || offer.booking.client?.lastName || ""
        ),
        service: offer.booking.service,
        startAt: offer.booking.startAt,
        endAt: offer.booking.endAt,
        timeSlots: offer.booking.timeSlots,
        address: offer.booking.address,
        pets: offer.booking.pets,
        totalPrice: offer.booking.totalPrice,
        notes: offer.booking.notes,
        createdAt: offer.createdAt,
      }));

    // Combine all accepted jobs
    const allAcceptedJobs = [...acceptedJobs, ...acceptedPoolJobs];

    // Get archived jobs
    const archivedJobs = archivedBookings.map((booking) => ({
      id: booking.id,
      bookingId: booking.id,
      type: "direct" as const,
      status: booking.status === "completed" ? "completed" : "cancelled" as const,
      clientName: formatClientNameForSitter(
        booking.firstName || booking.client?.firstName || "",
        booking.lastName || booking.client?.lastName || ""
      ),
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots,
      address: booking.address,
      pets: booking.pets,
      totalPrice: booking.totalPrice,
      notes: booking.notes,
      createdAt: booking.createdAt,
    }));

    // Get tier information
    const currentTier = sitter.currentTierId
      ? await prisma.sitterTier.findUnique({
          where: { id: sitter.currentTierId },
        })
      : null;

    // Get all tiers for comparison
    const allTiers = await prisma.sitterTier.findMany({
      orderBy: { priorityLevel: "desc" },
    });

    // Calculate performance metrics (last 30 days)
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    const [points, completionRate, responseRate] = await Promise.all([
      calculateSitterPoints(id, periodStart, periodEnd),
      calculateCompletionRate(id, periodStart, periodEnd),
      calculateResponseRate(id, periodStart, periodEnd),
    ]);

    // Get all pool offers for this sitter (for stats)
    const allPoolOffersForStats = await prisma.sitterPoolOffer.findMany({
      where: {
        OR: [
          { sitterId: id },
          {
            sitterIds: {
              contains: id,
            },
          },
        ],
        createdAt: {
          gte: periodStart,
        },
      },
    });

    // Calculate jobs received vs declined
    const jobsReceived = allPoolOffersForStats.length;
    const jobsDeclined = allPoolOffersForStats.filter((offer) => {
      const responses = JSON.parse(offer.responses || "[]");
      return responses.some(
        (r: any) => r.sitterId === id && (r.response?.toLowerCase() === "no" || r.response?.toLowerCase() === "decline")
      );
    }).length;
    const jobsAccepted = allPoolOffersForStats.filter((offer) => offer.acceptedSitterId === id).length;
    const acceptanceRate = jobsReceived > 0 ? (jobsAccepted / jobsReceived) * 100 : 0;

    // Determine what they need to improve
    const nextTier = allTiers.find((tier) => {
      if (!currentTier) return tier.isDefault;
      return tier.priorityLevel > currentTier.priorityLevel;
    });

    const improvementAreas: string[] = [];
    if (nextTier) {
      if (points < nextTier.pointTarget) {
        improvementAreas.push(`Earn ${nextTier.pointTarget - points} more points (need ${nextTier.pointTarget} total)`);
      }
      if (nextTier.minCompletionRate && completionRate < nextTier.minCompletionRate) {
        improvementAreas.push(`Improve completion rate to ${nextTier.minCompletionRate}% (currently ${completionRate.toFixed(1)}%)`);
      }
      if (nextTier.minResponseRate && responseRate < nextTier.minResponseRate) {
        improvementAreas.push(`Improve response rate to ${nextTier.minResponseRate}% (currently ${responseRate.toFixed(1)}%)`);
      }
    }

    // Get tier history
    const tierHistory = await prisma.sitterTierHistory.findMany({
      where: { sitterId: id },
      include: { tier: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      sitter: {
        id: sitter.id,
        firstName: sitter.firstName,
        lastName: sitter.lastName,
        email: sitter.email,
        phone: sitter.phone,
        commissionPercentage: sitter.commissionPercentage,
      },
      jobs: {
        needsResponse: needsResponseJobs,
        accepted: allAcceptedJobs,
        tooLate: tooLateJobs,
        archived: archivedJobs,
      },
      tier: currentTier
        ? {
            id: currentTier.id,
            name: currentTier.name,
            priorityLevel: currentTier.priorityLevel,
            pointTarget: currentTier.pointTarget,
            minCompletionRate: currentTier.minCompletionRate,
            minResponseRate: currentTier.minResponseRate,
            benefits: currentTier.benefits ? JSON.parse(currentTier.benefits) : {},
          }
        : null,
      performance: {
        points,
        completionRate,
        responseRate,
        jobsReceived,
        jobsDeclined,
        jobsAccepted,
        acceptanceRate,
        periodStart,
        periodEnd,
      },
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.name,
            pointTarget: nextTier.pointTarget,
            minCompletionRate: nextTier.minCompletionRate,
            minResponseRate: nextTier.minResponseRate,
          }
        : null,
      improvementAreas,
      tierHistory: tierHistory.map((h) => ({
        id: h.id,
        tierName: h.tier.name,
        points: h.points,
        completionRate: h.completionRate,
        responseRate: h.responseRate,
        periodStart: h.periodStart,
        periodEnd: h.periodEnd,
        createdAt: h.createdAt,
      })),
      isAdminView,
    });
  } catch (error: any) {
    console.error("Failed to fetch sitter dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

