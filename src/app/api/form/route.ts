import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { calculateBookingPrice } from "@/lib/rates";
import { sendSMS, formatPhoneNumber } from "@/lib/openphone";
import { formatPetsByQuantity } from "@/lib/booking-utils";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      service,
      startAt,
      endAt,
      petNames,
      petSpecies,
      specialInstructions,
      additionalNotes,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !service || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create pets array
    const pets = petNames.map((name: string, index: number) => ({
      name,
      species: petSpecies[index] || "Dog",
    }));

    // Calculate price
    const totalPrice = await calculateBookingPrice(
      service,
      new Date(startAt),
      new Date(endAt),
      pets.length
    );

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        firstName,
        lastName,
        phone: formatPhoneNumber(phone),
        email: email || null,
        address,
        service,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: "pending",
        totalPrice,
        pets: {
          create: pets.map(pet => ({
            name: pet.name,
            species: pet.species,
          })),
        },
        specialInstructions: specialInstructions || null,
        additionalNotes: additionalNotes || null,
      },
      include: {
        pets: true,
      },
    });

    // Send SMS confirmation to client
    const petQuantities = formatPetsByQuantity(booking.pets);
    const clientMessage = `🐾 BOOKING CONFIRMED!\n\nHi ${firstName},\n\nYour ${service} booking is confirmed for ${new Date(startAt).toLocaleDateString()} at ${new Date(startAt).toLocaleTimeString()}.\n\nPets: ${petQuantities}\nTotal: $${totalPrice.toFixed(2)}\n\nWe'll see you soon!`;
    
    await sendSMS(formatPhoneNumber(phone), clientMessage);

    // Send alert to owner
    const ownerMessage = `📱 NEW BOOKING ALERT\n\n${firstName} ${lastName} - ${service}\nDate: ${new Date(startAt).toLocaleDateString()} at ${new Date(startAt).toLocaleTimeString()}\nPets: ${petQuantities}\nPhone: ${phone}\nTotal: $${totalPrice.toFixed(2)}`;
    
    // Send to owner's phone (you'll need to set this in environment variables)
    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      await sendSMS(formatPhoneNumber(ownerPhone), ownerMessage);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        totalPrice,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}