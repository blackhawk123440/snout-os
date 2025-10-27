import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendSMS } from "@/lib/openphone";
import { formatPetsByQuantity } from "@/lib/booking-utils";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        pets: true,
        sitter: true,
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, sitterId } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        pets: true,
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(sitterId && { sitterId }),
      },
      include: {
        pets: true,
        sitter: true,
      },
    });

    // Send confirmation SMS to client if booking is confirmed
    if (status === "confirmed") {
      const petQuantities = formatPetsByQuantity(booking.pets);
      const message = `🐾 BOOKING CONFIRMED!\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking is confirmed for ${booking.startAt.toLocaleDateString()} at ${booking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nWe'll see you soon!`;
      
      await sendSMS(booking.phone, message);
    }

    // Send sitter assignment notification
    if (sitterId && booking.sitterId !== sitterId) {
      const sitter = await prisma.sitter.findUnique({
        where: { id: sitterId },
      });

      if (sitter) {
        const petQuantities = formatPetsByQuantity(booking.pets);
        const message = `👋 SITTER ASSIGNED!\n\nHi ${sitter.firstName},\n\nYou've been assigned to ${booking.firstName} ${booking.lastName}'s ${booking.service} booking on ${booking.startAt.toLocaleDateString()} at ${booking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nAddress: ${booking.address}\n\nPlease confirm your availability.`;
        
        await sendSMS(sitter.phone, message);
      }
    }

    return NextResponse.json({ booking: updatedBooking });
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}