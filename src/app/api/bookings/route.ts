import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        pets: true,
        sitter: true,
      },
      orderBy: {
        startAt: "desc",
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

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
      pets,
      specialInstructions,
      additionalNotes,
      totalPrice,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !service || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        address,
        service,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: "pending",
        totalPrice: totalPrice || 0,
        pets: {
          create: pets.map((pet: any) => ({
            name: pet.name,
            species: pet.species,
          })),
        },
        specialInstructions: specialInstructions || null,
        additionalNotes: additionalNotes || null,
      },
      include: {
        pets: true,
        sitter: true,
      },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}