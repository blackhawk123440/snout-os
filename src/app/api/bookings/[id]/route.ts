import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPetsByQuantity, calculatePriceBreakdown } from "@/lib/booking-utils";
import { sendMessage } from "@/lib/message-utils";
import { getSitterPhone } from "@/lib/phone-utils";

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
      // totalPrice is ignored - always recalculated
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
        // totalPrice is always recalculated, never set from request
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

    // Always recalculate totalPrice based on current booking data
    // This ensures the stored totalPrice always matches the calculated total
    const breakdown = calculatePriceBreakdown(finalBooking);
    const calculatedTotal = breakdown.total;
    
    // Update totalPrice if it differs from calculated (more than 0.01 difference to account for rounding)
    if (Math.abs((finalBooking.totalPrice || 0) - calculatedTotal) > 0.01) {
      await prisma.booking.update({
        where: { id },
        data: { totalPrice: calculatedTotal },
      });
      // Update finalBooking object with new totalPrice
      finalBooking.totalPrice = calculatedTotal;
    }

    // Send confirmation SMS to client if booking is confirmed
    if (status === "confirmed") {
      const petQuantities = formatPetsByQuantity(finalBooking.pets);
      // Calculate the true total
      const breakdown = calculatePriceBreakdown(finalBooking);
      const calculatedTotal = breakdown.total;
      const message = `🐾 BOOKING CONFIRMED!\n\nHi ${finalBooking.firstName},\n\nYour ${finalBooking.service} booking is confirmed for ${finalBooking.startAt.toLocaleDateString()} at ${finalBooking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nTotal: $${calculatedTotal.toFixed(2)}\n\nWe'll see you soon!`;
      
      await sendMessage(finalBooking.phone, message, finalBooking.id);
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
          const message = `👋 SITTER ASSIGNED!\n\nHi ${sitter.firstName},\n\nYou've been assigned to ${finalBooking.firstName} ${finalBooking.lastName}'s ${finalBooking.service} booking on ${finalBooking.startAt.toLocaleDateString()} at ${finalBooking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nAddress: ${finalBooking.address}\nTotal: $${calculatedTotal.toFixed(2)}\n\nPlease confirm your availability.`;
          
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