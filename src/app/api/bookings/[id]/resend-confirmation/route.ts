/**
 * Resend Confirmation API (Phase 6.2)
 * 
 * Resends booking confirmation message to client.
 * Per Master Spec 8.1.5: One click actions - resend confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueAutomation } from "@/lib/automation-queue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Phase 6.2: Enqueue booking confirmation automation
    await enqueueAutomation(
      "bookingConfirmation",
      "client",
      { bookingId },
      `bookingConfirmation:client:${bookingId}:resend`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resend confirmation:", error);
    return NextResponse.json(
      { error: "Failed to resend confirmation" },
      { status: 500 }
    );
  }
}

