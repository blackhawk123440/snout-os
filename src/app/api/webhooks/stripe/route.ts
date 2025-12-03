import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/openphone";
import { formatPetsByQuantity, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage, calculatePriceBreakdown } from "@/lib/booking-utils";
import { sendMessage } from "@/lib/message-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle successful payment
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata?.bookingId;
      
      if (bookingId) {
        // Update booking payment status
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: "paid" },
          include: {
            pets: true,
            timeSlots: {
              orderBy: { startAt: "asc" },
            },
          },
        });

        // Send confirmation message if booking is confirmed
        if (booking.status === "confirmed") {
          const shouldSendToClient = await shouldSendToRecipient("bookingConfirmation", "client");
          if (shouldSendToClient) {
            const petQuantities = formatPetsByQuantity(booking.pets);
            const breakdown = calculatePriceBreakdown(booking);
            const calculatedTotal = breakdown.total;
            const formattedDatesTimes = formatDatesAndTimesForMessage({
              service: booking.service,
              startAt: booking.startAt,
              endAt: booking.endAt,
              timeSlots: booking.timeSlots || [],
            });

            let clientMessageTemplate = await getMessageTemplate("bookingConfirmation", "client");
            if (!clientMessageTemplate || clientMessageTemplate.trim() === "") {
              clientMessageTemplate = "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\nWe'll see you soon!";
            }

            const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${booking.id}`;
            
            let clientMessage = replaceTemplateVariables(clientMessageTemplate, {
              firstName: booking.firstName,
              service: booking.service,
              datesTimes: formattedDatesTimes,
              date: formatDateForMessage(booking.startAt),
              time: formatTimeForMessage(booking.startAt),
              petQuantities,
              totalPrice: calculatedTotal.toFixed(2),
              bookingUrl: bookingDetailsUrl,
            });

            const hasDetailedScheduleToken = /\{\{(datesTimes|schedule|visits|dateTime|date_time|dateAndTime|dates|times)\}\}/i.test(clientMessageTemplate);
            if (!hasDetailedScheduleToken) {
              const timeStr = formatTimeForMessage(booking.startAt);
              const onPattern = /\s+on\s+[A-Za-z]{3}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s+[AP]M/gi;
              const forPattern = /\s+for\s+[A-Za-z]{3}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s+[AP]M/gi;
              const dashPattern = /\s+—\s+[A-Za-z]{3}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s+[AP]M/gi;
              clientMessage = clientMessage.replace(onPattern, "").replace(forPattern, "").replace(dashPattern, "");
              
              const dateStr = formatDateForMessage(booking.startAt);
              const exactOnRegex = new RegExp(`\\s+on\\s+${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'gi');
              const exactForRegex = new RegExp(`\\s+for\\s+${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'gi');
              const exactDashRegex = new RegExp(`\\s—\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'gi');
              clientMessage = clientMessage.replace(exactOnRegex, "").replace(exactForRegex, "").replace(exactDashRegex, "");
              
              const petsMarker = /\n{1,2}Pets:/i;
              const totalMarker = /\n{1,2}Total:/i;
              const closingMarker = /\n{1,2}(We'll see you soon|We will see you soon|See you soon|Thank you)/i;
              if (petsMarker.test(clientMessage)) {
                clientMessage = clientMessage.replace(petsMarker, `\n\n${formattedDatesTimes}\n\nPets:`);
              } else if (totalMarker.test(clientMessage)) {
                clientMessage = clientMessage.replace(totalMarker, `\n\n${formattedDatesTimes}\n\nTotal:`);
              } else if (closingMarker.test(clientMessage)) {
                clientMessage = clientMessage.replace(closingMarker, `\n\n${formattedDatesTimes}\n\n$1`);
              } else {
                clientMessage += `\n\n${formattedDatesTimes}`;
              }
            }

            await sendMessage(booking.phone, clientMessage, booking.id);
          }
        }
      }
    }

    // Handle invoice payment
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const bookingId = invoice.metadata?.bookingId;
      
      if (bookingId) {
        // Update booking payment status
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: "paid" },
          include: {
            pets: true,
            timeSlots: {
              orderBy: { startAt: "asc" },
            },
          },
        });

        // Send confirmation message if booking is confirmed (same logic as above)
        if (booking.status === "confirmed") {
          const shouldSendToClient = await shouldSendToRecipient("bookingConfirmation", "client");
          if (shouldSendToClient) {
            const petQuantities = formatPetsByQuantity(booking.pets);
            const breakdown = calculatePriceBreakdown(booking);
            const calculatedTotal = breakdown.total;
            const formattedDatesTimes = formatDatesAndTimesForMessage({
              service: booking.service,
              startAt: booking.startAt,
              endAt: booking.endAt,
              timeSlots: booking.timeSlots || [],
            });

            let clientMessageTemplate = await getMessageTemplate("bookingConfirmation", "client");
            if (!clientMessageTemplate || clientMessageTemplate.trim() === "") {
              clientMessageTemplate = "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\nWe'll see you soon!";
            }

            const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${booking.id}`;
            
            let clientMessage = replaceTemplateVariables(clientMessageTemplate, {
              firstName: booking.firstName,
              service: booking.service,
              datesTimes: formattedDatesTimes,
              date: formatDateForMessage(booking.startAt),
              time: formatTimeForMessage(booking.startAt),
              petQuantities,
              totalPrice: calculatedTotal.toFixed(2),
              bookingUrl: bookingDetailsUrl,
            });

            const hasDetailedScheduleToken = /\{\{(datesTimes|schedule|visits|dateTime|date_time|dateAndTime|dates|times)\}\}/i.test(clientMessageTemplate);
            if (!hasDetailedScheduleToken) {
              const timeStr = formatTimeForMessage(booking.startAt);
              const onPattern = /\s+on\s+[A-Za-z]{3}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s+[AP]M/gi;
              const forPattern = /\s+for\s+[A-Za-z]{3}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s+[AP]M/gi;
              const dashPattern = /\s+—\s+[A-Za-z]{3}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s+[AP]M/gi;
              clientMessage = clientMessage.replace(onPattern, "").replace(forPattern, "").replace(dashPattern, "");
              
              const dateStr = formatDateForMessage(booking.startAt);
              const exactOnRegex = new RegExp(`\\s+on\\s+${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'gi');
              const exactForRegex = new RegExp(`\\s+for\\s+${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'gi');
              const exactDashRegex = new RegExp(`\\s—\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'gi');
              clientMessage = clientMessage.replace(exactOnRegex, "").replace(exactForRegex, "").replace(exactDashRegex, "");
              
              const petsMarker = /\n{1,2}Pets:/i;
              const totalMarker = /\n{1,2}Total:/i;
              const closingMarker = /\n{1,2}(We'll see you soon|We will see you soon|See you soon|Thank you)/i;
              if (petsMarker.test(clientMessage)) {
                clientMessage = clientMessage.replace(petsMarker, `\n\n${formattedDatesTimes}\n\nPets:`);
              } else if (totalMarker.test(clientMessage)) {
                clientMessage = clientMessage.replace(totalMarker, `\n\n${formattedDatesTimes}\n\nTotal:`);
              } else if (closingMarker.test(clientMessage)) {
                clientMessage = clientMessage.replace(closingMarker, `\n\n${formattedDatesTimes}\n\n$1`);
              } else {
                clientMessage += `\n\n${formattedDatesTimes}`;
              }
            }

            await sendMessage(booking.phone, clientMessage, booking.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}