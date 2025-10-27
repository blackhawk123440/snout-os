import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const clients = await prisma.booking.groupBy({
      by: ['firstName', 'lastName', 'phone', 'email', 'address'],
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
      orderBy: {
        _max: {
          createdAt: 'desc',
        },
      },
    });

    const formattedClients = clients.map((client, index) => ({
      id: `client-${index}`, // Generate a unique ID for each client
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      address: client.address,
      totalBookings: client._count.id,
      lastBooking: client._max.createdAt?.toISOString(),
      createdAt: client._max.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ clients: formattedClients });
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, phone, email, address } = await request.json();

    // For now, we'll just return success since we're using booking data
    // In a real implementation, you'd create a separate Client model
    return NextResponse.json({ 
      message: "Client data processed",
      client: {
        firstName,
        lastName,
        phone,
        email,
        address,
      }
    });
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
