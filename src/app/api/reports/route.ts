import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendSMS } from "@/lib/openphone";
import { formatPetsByQuantity } from "@/lib/booking-utils";

const prisma = new PrismaClient();

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
    const report = await prisma.report.create({
      data: {
        bookingId,
        sitterId,
        content,
        mediaUrls: mediaUrls || [],
        visitStarted: visitStarted ? new Date(visitStarted) : null,
        visitCompleted: visitCompleted ? new Date(visitCompleted) : null,
      },
    });

    // Send report to client
    const petQuantities = formatPetsByQuantity(booking.pets);
    const clientMessage = `🐾 VISIT REPORT\n\nHi ${booking.firstName},\n\nYour ${booking.service} visit has been completed!\n\nPets: ${petQuantities}\nSitter: ${booking.sitter?.firstName || 'Assigned sitter'}\n\nReport: ${content}\n\nThank you for choosing Snout Services!`;
    
    await sendSMS(booking.phone, clientMessage);

    // Send thank you message
    const thankYouMessage = `🐾 THANK YOU!\n\nHi ${booking.firstName},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their ${booking.service.toLowerCase()}.\n\nWe look forward to caring for your pets again soon!`;
    
    await sendSMS(booking.phone, thankYouMessage);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        content: report.content,
        mediaUrls: report.mediaUrls,
        visitStarted: report.visitStarted,
        visitCompleted: report.visitCompleted,
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