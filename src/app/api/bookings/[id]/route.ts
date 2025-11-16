import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, calculatePriceBreakdown, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage } from "@/lib/booking-utils";
import { sendMessage } from "@/lib/message-utils";
import { getSitterPhone } from "@/lib/phone-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
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

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Failed to fetch booking:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      status, 
      sitterId, 
      firstName, 
      lastName, 
      phone, 
      email, 
      address, 
      pickupAddress,
      dropoffAddress,
      service, 
      startAt, 
      endAt, 
      quantity, 
      afterHours, 
      holiday, 
      totalPrice, 
      paymentStatus, 
      notes,
      timeSlots,
      pets
    } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
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

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Validate status if provided
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate service if provided
    if (service) {
      const validServices = ["Dog Walking", "Housesitting", "24/7 Care", "Drop-ins", "Pet Taxi"];
      if (!validServices.includes(service)) {
        return NextResponse.json(
          { error: `Invalid service: ${service}. Valid services are: ${validServices.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate dates if provided
    if (startAt || endAt) {
      if (startAt) {
        const startDate = new Date(startAt);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format for startAt" },
            { status: 400 }
          );
        }
      }
      if (endAt) {
        const endDate = new Date(endAt);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format for endAt" },
            { status: 400 }
          );
        }
      }
      if (startAt && endAt) {
        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        if (startDate >= endDate) {
          return NextResponse.json(
            { error: "endAt must be after startAt" },
            { status: 400 }
          );
        }
      }
    }

    // Validate sitterId if provided
    if (sitterId !== undefined && sitterId !== null && sitterId !== "") {
      const sitterExists = await prisma.sitter.findUnique({
        where: { id: sitterId },
      });
      if (!sitterExists) {
        return NextResponse.json(
          { error: "Sitter not found" },
          { status: 404 }
        );
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(sitterId !== undefined && { sitterId: sitterId === "" || sitterId === null ? null : sitterId }),
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(email !== undefined && { email: email ? email.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(pickupAddress !== undefined && { pickupAddress: pickupAddress ? pickupAddress.trim() : null }),
        ...(dropoffAddress !== undefined && { dropoffAddress: dropoffAddress ? dropoffAddress.trim() : null }),
        ...(service && { service: service.trim() }),
        ...(startAt && { startAt: new Date(startAt) }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(quantity !== undefined && quantity >= 0 && { quantity }),
        ...(afterHours !== undefined && { afterHours }),
        ...(holiday !== undefined && { holiday }),
        ...(totalPrice !== undefined && totalPrice >= 0 && { totalPrice }),
        ...(paymentStatus && { paymentStatus }),
        ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
        // If status is being set to confirmed, also set payment status to paid
        ...(status === "confirmed" && { paymentStatus: "paid" }),
      },
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

    // Handle timeSlots and pets updates in a transaction for atomicity
    if ((timeSlots && Array.isArray(timeSlots)) || (pets && Array.isArray(pets))) {
      await prisma.$transaction(async (tx) => {
        // Handle timeSlots updates if provided
        if (timeSlots && Array.isArray(timeSlots)) {
          // Validate timeSlots structure
          for (const ts of timeSlots) {
            if (!ts || typeof ts !== 'object') {
              throw new Error("Invalid timeSlot data structure");
            }
            const tsStart = new Date(ts.startAt);
            const tsEnd = new Date(ts.endAt);
            if (isNaN(tsStart.getTime()) || isNaN(tsEnd.getTime())) {
              throw new Error("Invalid date format in timeSlot");
            }
            if (tsStart >= tsEnd) {
              throw new Error("timeSlot endAt must be after startAt");
            }
          }

          // Delete existing timeSlots for this booking
          await tx.timeSlot.deleteMany({
            where: { bookingId: id },
          });

          // Create new timeSlots
          if (timeSlots.length > 0) {
            await tx.timeSlot.createMany({
              data: timeSlots.map((ts: { startAt: string | Date; endAt: string | Date; duration?: number }) => {
                const startDate = new Date(ts.startAt);
                const endDate = new Date(ts.endAt);
                const calculatedDuration = ts.duration || Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                return {
                  bookingId: id,
                  startAt: startDate,
                  endAt: endDate,
                  duration: calculatedDuration > 0 ? calculatedDuration : 30, // Default to 30 min if invalid
                };
              }),
            });
          }

          // Update quantity based on timeSlots count
          await tx.booking.update({
            where: { id },
            data: { quantity: timeSlots.length > 0 ? timeSlots.length : updatedBooking.quantity },
          });
        }

        // Handle pets updates if provided
        if (pets && Array.isArray(pets)) {
          // Validate pets structure
          if (pets.length === 0) {
            throw new Error("At least one pet is required");
          }

          for (const pet of pets) {
            if (!pet || typeof pet !== 'object') {
              throw new Error("Invalid pet data structure");
            }
            if (!pet.species || !pet.species.trim()) {
              throw new Error("Each pet must have a species");
            }
          }

          // Delete existing pets for this booking
          await tx.pet.deleteMany({
            where: { bookingId: id },
          });

          // Create new pets
          await tx.pet.createMany({
            data: pets.map((pet: { name?: string; species: string; notes?: string }) => ({
              bookingId: id,
              name: (pet.name || `Pet ${pet.species}`).trim(),
              species: pet.species.trim(),
              notes: pet.notes ? pet.notes.trim() : null,
            })),
          });
        }
      });
    }

    // Fetch final booking with all relations after all updates
    const finalBooking = await prisma.booking.findUnique({
      where: { id },
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

    if (!finalBooking) {
      return NextResponse.json({ error: "Failed to fetch updated booking" }, { status: 500 });
    }

    // Send confirmation SMS if booking is confirmed (using automation templates if enabled)
    if (status === "confirmed") {
      const petQuantities = formatPetsByQuantity(finalBooking.pets);
      // Calculate the true total
      const breakdown = calculatePriceBreakdown(finalBooking);
      const calculatedTotal = breakdown.total;
      
      // Check if bookingConfirmation automation is enabled
      const shouldSendToClient = await shouldSendToRecipient("bookingConfirmation", "client");
      const shouldSendToSitter = finalBooking.sitterId ? await shouldSendToRecipient("bookingConfirmation", "sitter") : false;
      const shouldSendToOwner = await shouldSendToRecipient("bookingConfirmation", "owner");
      
      // Format dates and times using the shared function that matches booking details
      const formattedDatesTimes = formatDatesAndTimesForMessage({
        service: finalBooking.service,
        startAt: finalBooking.startAt,
        endAt: finalBooking.endAt,
        timeSlots: finalBooking.timeSlots || [],
      });
      
      // Send to client
      if (shouldSendToClient) {
        let clientMessageTemplate = await getMessageTemplate("bookingConfirmation", "client");
        // If template is null (doesn't exist) or empty string, use default
        if (!clientMessageTemplate || clientMessageTemplate.trim() === "") {
          clientMessageTemplate = "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\nWe'll see you soon!";
        }
        
        const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${finalBooking.id}`;
        
        let clientMessage = replaceTemplateVariables(clientMessageTemplate, {
          firstName: finalBooking.firstName,
          service: finalBooking.service,
          datesTimes: formattedDatesTimes,
          date: formatDateForMessage(finalBooking.startAt), // Now uses short format (Jan 5)
          time: formatTimeForMessage(finalBooking.startAt),
          petQuantities,
          totalPrice: calculatedTotal.toFixed(2),
          bookingUrl: bookingDetailsUrl,
        });
        
        // Check if template has detailed schedule token
        const hasDetailedScheduleToken = /\{\{(datesTimes|schedule|visits|dateTime|date_time|dateAndTime|dates|times)\}\}/i.test(clientMessageTemplate);
        
        // Always include the full schedule if the template doesn't explicitly include it
        if (!hasDetailedScheduleToken) {
          // Remove inline date/time patterns: " — <date> at <time>", " on <date> at <time>", " for <date> at <time>"
          const dateStr = formatDateForMessage(finalBooking.startAt);
          const timeStr = formatTimeForMessage(finalBooking.startAt);
          const dashRegex = new RegExp(`\\s—\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
          const onRegex = new RegExp(`\\son\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
          const forRegex = new RegExp(`\\sfor\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
          clientMessage = clientMessage.replace(dashRegex, "").replace(onRegex, "").replace(forRegex, "");
          
          // Insert the schedule before "Pets:", "Total:", or before closing message if neither present
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
        
        await sendMessage(finalBooking.phone, clientMessage, finalBooking.id);
      } else {
        // Fallback to hardcoded message if automation is disabled
        const message = `🐾 BOOKING CONFIRMED!\n\nHi ${finalBooking.firstName},\n\nYour ${finalBooking.service} booking is confirmed:\n${formattedDatesTimes}\n\nPets: ${petQuantities}\nTotal: $${calculatedTotal.toFixed(2)}\n\nWe'll see you soon!`;
        await sendMessage(finalBooking.phone, message, finalBooking.id);
      }
      
      // Send to sitter if assigned
      if (shouldSendToSitter && finalBooking.sitterId) {
        const sitter = await prisma.sitter.findUnique({
          where: { id: finalBooking.sitterId },
        });
        
        if (sitter) {
          const sitterPhone = await getSitterPhone(finalBooking.sitterId, undefined, "bookingConfirmation");
          
          if (sitterPhone) {
            const commissionPercentage = sitter.commissionPercentage || 80.0;
            const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;
            
            let sitterMessageTemplate = await getMessageTemplate("bookingConfirmation", "sitter");
            // If template is null (doesn't exist) or empty string, use default
            if (!sitterMessageTemplate || sitterMessageTemplate.trim() === "") {
              sitterMessageTemplate = "✅ BOOKING CONFIRMED!\n\nHi {{sitterFirstName}},\n\n{{firstName}} {{lastName}}'s {{service}} booking is confirmed:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nView details in your dashboard.";
            }
            
            const sitterMessage = replaceTemplateVariables(sitterMessageTemplate, {
              sitterFirstName: sitter.firstName,
              firstName: finalBooking.firstName,
              lastName: finalBooking.lastName,
              service: finalBooking.service,
              datesTimes: formattedDatesTimes,
              date: formatDateForMessage(finalBooking.startAt), // Now uses short format (Jan 5)
              time: formatTimeForMessage(finalBooking.startAt),
              petQuantities,
              address: finalBooking.address || 'TBD',
              earnings: sitterEarnings.toFixed(2),
              totalPrice: calculatedTotal, // Pass actual total so earnings can be calculated
              total: calculatedTotal,
            }, {
              isSitterMessage: true,
              sitterCommissionPercentage: commissionPercentage,
            });
            
            await sendMessage(sitterPhone, sitterMessage, finalBooking.id);
          }
        }
      }
      
      // Send to owner if enabled
      if (shouldSendToOwner) {
        const { getOwnerPhone } = await import("@/lib/phone-utils");
        const ownerPhone = await getOwnerPhone(undefined, "bookingConfirmation");
        
        if (ownerPhone) {
          let ownerMessageTemplate = await getMessageTemplate("bookingConfirmation", "owner");
          // If template is null (doesn't exist) or empty string, use default
          if (!ownerMessageTemplate || ownerMessageTemplate.trim() === "") {
            ownerMessageTemplate = "✅ BOOKING CONFIRMED!\n\n{{firstName}} {{lastName}}'s {{service}} booking is confirmed:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\nView: {{bookingUrl}}";
          }
          
          const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${finalBooking.id}`;
          
          let ownerMessage = replaceTemplateVariables(ownerMessageTemplate, {
            firstName: finalBooking.firstName,
            lastName: finalBooking.lastName,
            service: finalBooking.service,
            datesTimes: formattedDatesTimes,
            date: formatDateForMessage(finalBooking.startAt), // Now uses short format (Jan 5)
            time: formatTimeForMessage(finalBooking.startAt),
            petQuantities,
            totalPrice: calculatedTotal.toFixed(2),
            bookingUrl: bookingDetailsUrl,
          });
          
          // Check if template has detailed schedule token
          const hasDetailedScheduleToken = /\{\{(datesTimes|schedule|visits|dateTime|date_time|dateAndTime|dates|times)\}\}/i.test(ownerMessageTemplate);
          
          // Always include the full schedule if the template doesn't explicitly include it
          if (!hasDetailedScheduleToken) {
            // Remove inline date/time patterns: " — <date> at <time>", " on <date> at <time>", " for <date> at <time>"
            const dateStr = formatDateForMessage(finalBooking.startAt);
            const timeStr = formatTimeForMessage(finalBooking.startAt);
            const dashRegex = new RegExp(`\\s—\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
            const onRegex = new RegExp(`\\son\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
            const forRegex = new RegExp(`\\sfor\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
            ownerMessage = ownerMessage.replace(dashRegex, "").replace(onRegex, "").replace(forRegex, "");
            
            // Insert the schedule before "Pets:" or "Total:" if present
            const petsMarker = /\n{1,2}Pets:/i;
            const totalMarker = /\n{1,2}Total:/i;
            if (petsMarker.test(ownerMessage)) {
              ownerMessage = ownerMessage.replace(petsMarker, `\n\n${formattedDatesTimes}\n\nPets:`);
            } else if (totalMarker.test(ownerMessage)) {
              ownerMessage = ownerMessage.replace(totalMarker, `\n\n${formattedDatesTimes}\n\nTotal:`);
            } else {
              ownerMessage += `\n\n${formattedDatesTimes}`;
            }
          }
          
          await sendMessage(ownerPhone, ownerMessage, finalBooking.id);
        }
      }
    }

    // Send sitter assignment notification
    if (sitterId !== undefined && booking.sitterId !== sitterId) {
      const sitter = await prisma.sitter.findUnique({
        where: { id: sitterId },
      });

      if (sitter) {
        const sitterPhone = await getSitterPhone(sitterId, undefined, "sitterAssignment");
        
        if (sitterPhone) {
          const petQuantities = formatPetsByQuantity(finalBooking.pets);
          // Calculate the true total
          const breakdown = calculatePriceBreakdown(finalBooking);
          const calculatedTotal = breakdown.total;
          // Calculate sitter earnings based on their commission percentage
          const commissionPercentage = sitter.commissionPercentage || 80.0;
          const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;
          
          // Format dates and times using the shared function that matches booking details
          const formattedDatesTimes = formatDatesAndTimesForMessage({
            service: finalBooking.service,
            startAt: finalBooking.startAt,
            endAt: finalBooking.endAt,
            timeSlots: finalBooking.timeSlots || [],
          });
          
          // Check if automation is enabled and should send to sitter
          const shouldSendToSitter = await shouldSendToRecipient("sitterAssignment", "sitter");
          
          let message: string;
          if (shouldSendToSitter) {
            // Use automation template if available
            let sitterMessageTemplate = await getMessageTemplate("sitterAssignment", "sitter");
            // If template is null (doesn't exist) or empty string, use default
            if (!sitterMessageTemplate || sitterMessageTemplate.trim() === "") {
              sitterMessageTemplate = "👋 SITTER ASSIGNED!\n\nHi {{sitterFirstName}},\n\nYou've been assigned to {{firstName}} {{lastName}}'s {{service}} booking:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nPlease confirm your availability.";
            }
            
            message = replaceTemplateVariables(sitterMessageTemplate, {
              sitterFirstName: sitter.firstName,
              firstName: finalBooking.firstName,
              lastName: finalBooking.lastName,
              service: finalBooking.service,
              datesTimes: formattedDatesTimes,
              date: formatDateForMessage(finalBooking.startAt), // Now uses short format (Jan 5)
              time: formatTimeForMessage(finalBooking.startAt),
              petQuantities,
              address: finalBooking.address || 'TBD',
              earnings: sitterEarnings.toFixed(2),
              commissionPercentage: commissionPercentage.toFixed(0),
              totalPrice: calculatedTotal, // Pass the actual total so earnings can be calculated
              total: calculatedTotal, // Pass the actual total so earnings can be calculated
            }, {
              isSitterMessage: true,
              sitterCommissionPercentage: commissionPercentage,
            });
            
            // Check if template has detailed schedule token
            const hasDetailedScheduleToken = /\{\{(datesTimes|schedule|visits|dateTime|date_time|dateAndTime|dates|times)\}\}/i.test(sitterMessageTemplate);
            
            // Always include the full schedule if the template doesn't explicitly include it
            if (!hasDetailedScheduleToken) {
              // Remove inline date/time patterns: " — <date> at <time>", " on <date> at <time>", " for <date> at <time>"
              const dateStr = formatDateForMessage(finalBooking.startAt);
              const timeStr = formatTimeForMessage(finalBooking.startAt);
              const dashRegex = new RegExp(`\\s—\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
              const onRegex = new RegExp(`\\son\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
              const forRegex = new RegExp(`\\sfor\\s${dateStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s+at\\s+${timeStr.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\.?`, 'i');
              message = message.replace(dashRegex, "").replace(onRegex, "").replace(forRegex, "");
              
              // Insert the schedule before "Pets:", "Address:", "Your Earnings:", or before closing message
              const petsMarker = /\n{1,2}Pets:/i;
              const addressMarker = /\n{1,2}Address:/i;
              const earningsMarker = /\n{1,2}Your Earnings:/i;
              if (petsMarker.test(message)) {
                message = message.replace(petsMarker, `\n\n${formattedDatesTimes}\n\nPets:`);
              } else if (addressMarker.test(message)) {
                message = message.replace(addressMarker, `\n\n${formattedDatesTimes}\n\nAddress:`);
              } else if (earningsMarker.test(message)) {
                message = message.replace(earningsMarker, `\n\n${formattedDatesTimes}\n\nYour Earnings:`);
              } else {
                message += `\n\n${formattedDatesTimes}`;
              }
            }
          } else {
            // Use hardcoded message if automation is not enabled
            message = `👋 SITTER ASSIGNED!\n\nHi ${sitter.firstName},\n\nYou've been assigned to ${finalBooking.firstName} ${finalBooking.lastName}'s ${finalBooking.service} booking:\n${formattedDatesTimes}\n\nPets: ${petQuantities}\nAddress: ${finalBooking.address}\nYour Earnings: $${sitterEarnings.toFixed(2)}\n\nPlease confirm your availability.`;
          }
          
          await sendMessage(sitterPhone, message, finalBooking.id);
        }
      }
    }

    return NextResponse.json({ booking: finalBooking });
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}