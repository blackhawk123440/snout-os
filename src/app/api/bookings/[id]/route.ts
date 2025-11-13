import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, calculatePriceBreakdown } from "@/lib/booking-utils";
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
      minutes, 
      quantity, 
      afterHours, 
      holiday, 
      totalPrice, 
      paymentStatus, 
      preferredContact, 
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

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(sitterId !== undefined && { sitterId: sitterId === "" || sitterId === null ? null : sitterId }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(address !== undefined && { address }),
        ...(pickupAddress !== undefined && { pickupAddress }),
        ...(dropoffAddress !== undefined && { dropoffAddress }),
        ...(service && { service }),
        ...(startAt && { startAt: new Date(startAt) }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(minutes !== undefined && { minutes }),
        ...(quantity !== undefined && { quantity }),
        ...(afterHours !== undefined && { afterHours }),
        ...(holiday !== undefined && { holiday }),
        ...(totalPrice !== undefined && { totalPrice }),
        ...(paymentStatus && { paymentStatus }),
        ...(preferredContact && { preferredContact }),
        ...(notes && { notes }),
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

    // Handle timeSlots updates if provided
    if (timeSlots && Array.isArray(timeSlots)) {
      // Delete existing timeSlots for this booking
      await prisma.timeSlot.deleteMany({
        where: { bookingId: id },
      });

      // Create new timeSlots
      if (timeSlots.length > 0) {
        await prisma.timeSlot.createMany({
          data: timeSlots.map((ts: any) => ({
            bookingId: id,
            startAt: new Date(ts.startAt),
            endAt: new Date(ts.endAt),
            duration: ts.duration || Math.round((new Date(ts.endAt).getTime() - new Date(ts.startAt).getTime()) / 60000),
          })),
        });
      }

      // Update quantity based on timeSlots count
      await prisma.booking.update({
        where: { id },
        data: { quantity: timeSlots.length > 0 ? timeSlots.length : updatedBooking.quantity },
      });
    }

    // Handle pets updates if provided
    if (pets && Array.isArray(pets)) {
      // Delete existing pets for this booking
      await prisma.pet.deleteMany({
        where: { bookingId: id },
      });

      // Create new pets
      if (pets.length > 0) {
        await prisma.pet.createMany({
          data: pets.map((pet: any) => ({
            bookingId: id,
            name: pet.name || `Pet ${pet.species}`,
            species: pet.species,
            notes: pet.notes || null,
          })),
        });
      }
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
      
      // Send to client
      if (shouldSendToClient) {
        let clientMessageTemplate = await getMessageTemplate("bookingConfirmation", "client");
        if (!clientMessageTemplate) {
          clientMessageTemplate = "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\nWe'll see you soon!";
        }
        
        const clientMessage = replaceTemplateVariables(clientMessageTemplate, {
          firstName: finalBooking.firstName,
          service: finalBooking.service,
          date: finalBooking.startAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          time: finalBooking.startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          petQuantities,
          totalPrice: calculatedTotal.toFixed(2),
        });
        
        await sendMessage(finalBooking.phone, clientMessage, finalBooking.id);
      } else {
        // Fallback to hardcoded message if automation is disabled
        const message = `🐾 BOOKING CONFIRMED!\n\nHi ${finalBooking.firstName},\n\nYour ${finalBooking.service} booking is confirmed for ${finalBooking.startAt.toLocaleDateString()} at ${finalBooking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nTotal: $${calculatedTotal.toFixed(2)}\n\nWe'll see you soon!`;
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
            if (!sitterMessageTemplate) {
              sitterMessageTemplate = "✅ BOOKING CONFIRMED!\n\nHi {{sitterFirstName}},\n\n{{firstName}} {{lastName}}'s {{service}} booking is confirmed for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nView details in your dashboard.";
            }
            
            const sitterMessage = replaceTemplateVariables(sitterMessageTemplate, {
              sitterFirstName: sitter.firstName,
              firstName: finalBooking.firstName,
              lastName: finalBooking.lastName,
              service: finalBooking.service,
              date: finalBooking.startAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              time: finalBooking.startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
          if (!ownerMessageTemplate) {
            ownerMessageTemplate = "✅ BOOKING CONFIRMED!\n\n{{firstName}} {{lastName}}'s {{service}} booking is confirmed for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}";
          }
          
          const ownerMessage = replaceTemplateVariables(ownerMessageTemplate, {
            firstName: finalBooking.firstName,
            lastName: finalBooking.lastName,
            service: finalBooking.service,
            date: finalBooking.startAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: finalBooking.startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            petQuantities,
            totalPrice: calculatedTotal.toFixed(2),
          });
          
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
          
          // Check if automation is enabled and should send to sitter
          const shouldSendToSitter = await shouldSendToRecipient("sitterAssignment", "sitter");
          
          let message: string;
          if (shouldSendToSitter) {
            // Use automation template if available
            let sitterMessageTemplate = await getMessageTemplate("sitterAssignment", "sitter");
            if (!sitterMessageTemplate) {
              sitterMessageTemplate = "👋 SITTER ASSIGNED!\n\nHi {{sitterFirstName}},\n\nYou've been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nPlease confirm your availability.";
            }
            
            message = replaceTemplateVariables(sitterMessageTemplate, {
              sitterFirstName: sitter.firstName,
              firstName: finalBooking.firstName,
              lastName: finalBooking.lastName,
              service: finalBooking.service,
              date: finalBooking.startAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              time: finalBooking.startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
          } else {
            // Use hardcoded message if automation is not enabled
            message = `👋 SITTER ASSIGNED!\n\nHi ${sitter.firstName},\n\nYou've been assigned to ${finalBooking.firstName} ${finalBooking.lastName}'s ${finalBooking.service} booking on ${finalBooking.startAt.toLocaleDateString()} at ${finalBooking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nAddress: ${finalBooking.address}\nYour Earnings: $${sitterEarnings.toFixed(2)}\n\nPlease confirm your availability.`;
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