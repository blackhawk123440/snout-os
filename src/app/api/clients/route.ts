import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// TODO: Client model doesn't exist in schema. Clients are stored in Booking model via firstName/lastName/phone/email.
// This route should be updated to aggregate unique clients from bookings or a Client model needs to be added to schema.

export async function GET() {
  try {
    // TODO: Client model doesn't exist - returning empty array to preserve function signature
    // To implement: Query bookings, group by phone/email, return unique clients
    return NextResponse.json({ clients: [] });
    
    /* Commented out until Client model is added or implementation updated:
    const clients = await prisma.client.findMany({
      include: {
        bookings: {
          include: {
            pets: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ clients });
    */
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, email, address, notes } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Client model doesn't exist - returning error to preserve function signature
    return NextResponse.json(
      { error: "Client creation not implemented - Client model missing" },
      { status: 501 }
    );

    /* Commented out until Client model is added:
    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ client });
    */
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
