import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateBookingPrice } from "@/lib/rates";

export async function GET() {
  try {
    // Test database connection first
    try {
      await prisma.$connect();
    } catch (connectError) {
      // Connection might already be established or database might not be available
      console.warn("Database connection warning:", connectError);
    }
    
    const bookings = await prisma.booking.findMany({
      include: {
        pets: true,
        sitter: true,
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: any) {
    console.error("Failed to fetch bookings:", error);
    // Return empty array instead of error to prevent dashboard crash
    return NextResponse.json({ 
      bookings: [],
      error: "Failed to fetch bookings",
      details: error?.message || "Unknown database error"
    }, { status: 200 }); // Return 200 with empty array so frontend doesn't crash
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

    // Calculate the correct price using our pricing logic
    const petCount = pets ? pets.length : 1;
    const quantity = 1; // Default to 1 visit
    const afterHours = false; // Default to false
    
    const priceCalculation = await calculateBookingPrice(
      service,
      new Date(startAt),
      new Date(endAt),
      petCount,
      quantity,
      afterHours
    );

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
        totalPrice: priceCalculation.total,
        quantity,
        afterHours,
        holiday: priceCalculation.holidayApplied,
        pets: {
          create: pets.map((pet: any) => ({
            name: pet.name,
            species: pet.species,
          })),
        },
        special: specialInstructions || additionalNotes || null,
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