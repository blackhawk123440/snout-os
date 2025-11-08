import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity } from "@/lib/booking-utils";
import { sendMessage } from "@/lib/message-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingId,
      sitterId,
      content,
      mediaUrls,
      visitStarted,
      visitCompleted,
    } = body;

    // Validate required fields
    if (!bookingId || !sitterId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Create report
    // Note: Report model doesn't have sitterId field in schema, but booking has sitter relation
    const report = await prisma.report.create({
      data: {
        bookingId,
        content,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.join(',') : (mediaUrls || ''),
        visitStarted: visitStarted ? new Date(visitStarted) : null,
        visitCompleted: visitCompleted ? new Date(visitCompleted) : null,
      },
    });

    // Send report to client
    const petQuantities = formatPetsByQuantity(booking.pets);
    const clientMessage = `🐾 VISIT REPORT\n\nHi ${booking.firstName},\n\nYour ${booking.service} visit has been completed!\n\nPets: ${petQuantities}\nSitter: ${booking.sitter?.firstName || 'Assigned sitter'}\n\nReport: ${content}\n\nThank you for choosing Snout Services!`;
    
    await sendMessage(booking.phone, clientMessage, bookingId);

    // Send thank you message
    const thankYouMessage = `🐾 THANK YOU!\n\nHi ${booking.firstName},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their ${booking.service.toLowerCase()}.\n\nWe look forward to caring for your pets again soon!`;
    
    await sendMessage(booking.phone, thankYouMessage, bookingId);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        content: report.content,
        mediaUrls: report.mediaUrls,
      },
    });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}