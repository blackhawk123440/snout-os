import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatClientNameForSitter } from "@/lib/booking-utils";

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

    // Get all bookings assigned to this sitter (direct assignments)
    const directBookings = await prisma.booking.findMany({
      where: {
        sitterId: id,
        status: { not: "cancelled" },
      },
      include: {
        pets: true,
        timeSlots: {
          orderBy: { startAt: "asc" },
        },
        client: true,
      },
      orderBy: { startAt: "asc" },
    });

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
      },
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

