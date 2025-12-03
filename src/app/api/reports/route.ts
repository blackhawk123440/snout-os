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
    const trimmedBookingId = bookingId?.trim();
    const trimmedSitterId = sitterId?.trim();
    const trimmedContent = content?.trim();
    
    if (!trimmedBookingId || !trimmedSitterId || !trimmedContent) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, sitterId, and content are required" },
        { status: 400 }
      );
    }

    // Validate content length
    if (trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: "Content must be less than 5000 characters" },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: trimmedBookingId },
      include: {
        pets: true,
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify sitter matches booking
    if (booking.sitterId !== trimmedSitterId) {
      return NextResponse.json(
        { error: "Sitter ID does not match booking's assigned sitter" },
        { status: 403 }
      );
    }

    // Validate date formats if provided
    if (visitStarted) {
      const visitStartDate = new Date(visitStarted);
      if (isNaN(visitStartDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for visitStarted" },
          { status: 400 }
        );
      }
    }

    if (visitCompleted) {
      const visitEndDate = new Date(visitCompleted);
      if (isNaN(visitEndDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for visitCompleted" },
          { status: 400 }
        );
      }
      if (visitStarted) {
        const visitStartDate = new Date(visitStarted);
        if (visitEndDate < visitStartDate) {
          return NextResponse.json(
            { error: "visitCompleted must be after visitStarted" },
            { status: 400 }
          );
        }
      }
    }

    // Validate mediaUrls if provided
    let validatedMediaUrls = '';
    if (mediaUrls) {
      if (Array.isArray(mediaUrls)) {
        const validUrls = mediaUrls.filter((url: unknown) => {
          if (typeof url !== 'string') return false;
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        });
        validatedMediaUrls = validUrls.join(',');
      } else if (typeof mediaUrls === 'string') {
        // Validate comma-separated URLs
        const urls = mediaUrls.split(',').map((url: string) => url.trim()).filter(Boolean);
        const validUrls = urls.filter((url: string) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        });
        validatedMediaUrls = validUrls.join(',');
      }
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        bookingId: trimmedBookingId,
        content: trimmedContent,
        mediaUrls: validatedMediaUrls,
        visitStarted: visitStarted ? new Date(visitStarted) : null,
        visitCompleted: visitCompleted ? new Date(visitCompleted) : null,
      },
    });

    // Send report to client
    const petQuantities = formatPetsByQuantity(booking.pets);
    const clientMessage = `🐾 VISIT REPORT\n\nHi ${booking.firstName},\n\nYour ${booking.service} visit has been completed!\n\nPets: ${petQuantities}\nSitter: ${booking.sitter?.firstName || 'Assigned sitter'}\n\nReport: ${trimmedContent}\n\nThank you for choosing Snout Services!`;
    
    await sendMessage(booking.phone, clientMessage, trimmedBookingId);

    // Send thank you message
    const thankYouMessage = `🐾 THANK YOU!\n\nHi ${booking.firstName},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their ${booking.service.toLowerCase()}.\n\nWe look forward to caring for your pets again soon!`;
    
    await sendMessage(booking.phone, thankYouMessage, trimmedBookingId);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        content: report.content,
        mediaUrls: report.mediaUrls,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { 
        error: "Failed to create report",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
