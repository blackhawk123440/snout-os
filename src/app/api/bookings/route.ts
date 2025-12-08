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
    
    // Use include instead of select to ensure all fields are returned
    // This is more reliable and ensures notes field is always included
    const bookings = await prisma.booking.findMany({
      include: {
        pets: true,
        sitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
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

    // Debug: Log a sample booking to verify notes are included
    if (bookings.length > 0) {
      const sampleBooking = bookings[0];
      console.log('Sample booking from API:', {
        id: sampleBooking.id,
        firstName: sampleBooking.firstName,
        lastName: sampleBooking.lastName,
        notes: sampleBooking.notes,
        notesType: typeof sampleBooking.notes,
        hasNotes: !!sampleBooking.notes,
      });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: unknown) {
    console.error("Failed to fetch bookings:", error);
    // Return empty array with proper error status to prevent dashboard crash
    // Frontend should handle this gracefully
    return NextResponse.json({ 
      bookings: [],
      error: "Failed to fetch bookings",
      details: error instanceof Error ? error.message : "Unknown database error"
    }, { status: 500 }); // Use proper error status, frontend should handle gracefully
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

    // Validate pets array
    if (!Array.isArray(pets) || pets.length === 0) {
      return NextResponse.json(
        { error: "At least one pet is required" },
        { status: 400 }
      );
    }

    // Validate pet data structure
    for (const pet of pets) {
      if (!pet || typeof pet !== 'object') {
        return NextResponse.json(
          { error: "Invalid pet data structure" },
          { status: 400 }
        );
      }
      if (!pet.name || !pet.species) {
        return NextResponse.json(
          { error: "Each pet must have a name and species" },
          { status: 400 }
        );
      }
    }

    // Validate date formats
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for startAt or endAt" },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "endAt must be after startAt" },
        { status: 400 }
      );
    }

    // Calculate the correct price using our pricing logic
    const petCount = pets.length;
    const quantity = 1; // Default to 1 visit
    const afterHours = false; // Default to false
    
    const priceCalculation = await calculateBookingPrice(
      service,
      startDate,
      endDate,
      petCount,
      quantity,
      afterHours
    );

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        service,
        startAt: startDate,
        endAt: endDate,
        status: "pending",
        totalPrice: priceCalculation.total,
        quantity,
        afterHours,
        holiday: priceCalculation.holidayApplied,
        pets: {
          create: pets.map((pet: { name: string; species: string }) => ({
            name: pet.name.trim() || "Pet",
            species: pet.species.trim() || "Dog",
          })),
        },
        notes: (specialInstructions || additionalNotes) ? (specialInstructions || additionalNotes).trim() : null,
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