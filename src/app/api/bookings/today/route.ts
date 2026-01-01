/**
 * Today Board API (Phase 6.2)
 * 
 * Returns bookings organized for the Today board view.
 * Per Master Spec 8.1: Today board with one-click actions.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active bookings
    const allBookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ["cancelled"] },
      },
      include: {
        pets: true,
        sitter: true,
        timeSlots: {
          orderBy: { startAt: "asc" },
        },
        client: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    // Filter bookings for today (starting today)
    const todayBookings = allBookings.filter((booking) => {
      const bookingDate = new Date(booking.startAt);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === today.getTime();
    });

    // Unassigned bookings (no sitter assigned, status is pending or confirmed)
    const unassignedBookings = allBookings.filter(
      (booking) => !booking.sitterId && (booking.status === "pending" || booking.status === "confirmed")
    );

    // Unpaid bookings (paymentStatus is unpaid, status is not cancelled)
    const unpaidBookings = allBookings.filter(
      (booking) => booking.paymentStatus === "unpaid" && booking.status !== "cancelled"
    );

    // At risk bookings
    // - Missing instructions (no address or no notes)
    // - Payment failures (paymentStatus is failed)
    // - Sitter issues (assigned but sitter is inactive or missing)
    const atRiskBookings = allBookings.filter((booking) => {
      // Missing instructions
      const missingInstructions = !booking.address || (!booking.notes || booking.notes.trim() === "");
      
      // Payment failures
      const paymentFailed = booking.paymentStatus === "failed";
      
      // Sitter issues
      const sitterIssue = booking.sitterId && (!booking.sitter || !booking.sitter.active);

      return missingInstructions || paymentFailed || sitterIssue;
    });

    // Format bookings for response
    const formatBooking = (booking: any) => ({
      id: booking.id,
      firstName: booking.firstName,
      lastName: booking.lastName,
      phone: booking.phone,
      email: booking.email,
      address: booking.address,
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPrice: booking.totalPrice,
      sitterId: booking.sitterId,
      sitter: booking.sitter ? {
        id: booking.sitter.id,
        firstName: booking.sitter.firstName,
        lastName: booking.sitter.lastName,
        active: booking.sitter.active,
      } : null,
      pets: booking.pets,
      timeSlots: booking.timeSlots,
      notes: booking.notes,
      stripePaymentLinkUrl: booking.stripePaymentLinkUrl,
    });

    return NextResponse.json({
      today: todayBookings.map(formatBooking),
      unassigned: unassignedBookings.map(formatBooking),
      unpaid: unpaidBookings.map(formatBooking),
      atRisk: atRiskBookings.map(formatBooking),
      stats: {
        todayCount: todayBookings.length,
        unassignedCount: unassignedBookings.length,
        unpaidCount: unpaidBookings.length,
        atRiskCount: atRiskBookings.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch today board data:", error);
    return NextResponse.json({ error: "Failed to fetch today board data" }, { status: 500 });
  }
}

