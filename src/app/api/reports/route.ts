import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage } from "@/lib/booking-utils";
import { sendMessage } from "@/lib/message-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";

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

    // Get booking with timeSlots for proper date/time formatting
    const bookingWithSlots = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    const petQuantities = formatPetsByQuantity(booking.pets);
    
    // Format dates and times using the shared function that matches booking details
    const formattedDatesTimes = bookingWithSlots ? formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: bookingWithSlots.timeSlots || [],
    }) : "";

    // Send visit report to client (if automation enabled)
    const shouldSendReport = await shouldSendToRecipient("visitReport", "client");
    if (shouldSendReport) {
      let reportTemplate = await getMessageTemplate("visitReport", "client");
      // If template is null (doesn't exist) or empty string, use default
      if (!reportTemplate || reportTemplate.trim() === "") {
        reportTemplate = "🐾 VISIT REPORT\n\nHi {{firstName}},\n\nYour {{service}} visit has been completed!\n\n{{datesTimes}}\n\nPets: {{petQuantities}}\nSitter: {{sitterName}}\n\nReport: {{reportContent}}\n\nThank you for choosing Snout Services!";
      }
      
      const reportMessage = replaceTemplateVariables(reportTemplate, {
        firstName: booking.firstName,
        service: booking.service,
        datesTimes: formattedDatesTimes,
        date: formatDateForMessage(booking.startAt),
        time: formatTimeForMessage(booking.startAt),
        petQuantities,
        sitterName: booking.sitter?.firstName || 'Assigned sitter',
        reportContent: content,
      });
      
      await sendMessage(booking.phone, reportMessage, bookingId);
    }

    // Send thank you message (if automation enabled)
    const shouldSendThankYou = await shouldSendToRecipient("postVisitThankYou", "client");
    if (shouldSendThankYou) {
      let thankYouTemplate = await getMessageTemplate("postVisitThankYou", "client");
      // If template is null (doesn't exist) or empty string, use default
      if (!thankYouTemplate || thankYouTemplate.trim() === "") {
        thankYouTemplate = "🐾 THANK YOU!\n\nHi {{firstName}},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their {{service}}.\n\nPets: {{petQuantities}}\n\nWe look forward to caring for your pets again soon!";
      }
      
      const thankYouMessage = replaceTemplateVariables(thankYouTemplate, {
        firstName: booking.firstName,
        service: booking.service.toLowerCase(),
        petQuantities,
      });
      
      await sendMessage(booking.phone, thankYouMessage, bookingId);
    }

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

      let reportTemplate = await getMessageTemplate("visitReport", "client");
      // If template is null (doesn't exist) or empty string, use default
      if (!reportTemplate || reportTemplate.trim() === "") {
        reportTemplate = "🐾 VISIT REPORT\n\nHi {{firstName}},\n\nYour {{service}} visit has been completed!\n\n{{datesTimes}}\n\nPets: {{petQuantities}}\nSitter: {{sitterName}}\n\nReport: {{reportContent}}\n\nThank you for choosing Snout Services!";
      }
      
      const reportMessage = replaceTemplateVariables(reportTemplate, {
        firstName: booking.firstName,
        service: booking.service,
        datesTimes: formattedDatesTimes,
        date: formatDateForMessage(booking.startAt),
        time: formatTimeForMessage(booking.startAt),
        petQuantities,
        sitterName: booking.sitter?.firstName || 'Assigned sitter',
        reportContent: content,
      });
      
      await sendMessage(booking.phone, reportMessage, bookingId);
    }

    // Send thank you message (if automation enabled)
    const shouldSendThankYou = await shouldSendToRecipient("postVisitThankYou", "client");
    if (shouldSendThankYou) {
      let thankYouTemplate = await getMessageTemplate("postVisitThankYou", "client");
      // If template is null (doesn't exist) or empty string, use default
      if (!thankYouTemplate || thankYouTemplate.trim() === "") {
        thankYouTemplate = "🐾 THANK YOU!\n\nHi {{firstName}},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their {{service}}.\n\nPets: {{petQuantities}}\n\nWe look forward to caring for your pets again soon!";
      }
      
      const thankYouMessage = replaceTemplateVariables(thankYouTemplate, {
        firstName: booking.firstName,
        service: booking.service.toLowerCase(),
        petQuantities,
      });
      
      await sendMessage(booking.phone, thankYouMessage, bookingId);
    }

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
