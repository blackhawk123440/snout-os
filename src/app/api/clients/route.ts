import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emitClientCreated } from "@/lib/event-emitter";

/**
 * GET /api/clients
 * Get all clients
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");
    const tag = searchParams.get("tag");

    const where: any = {};
    if (phone) where.phone = phone;
    if (email) where.email = email;
    if (tag) {
      where.tags = {
        contains: tag,
      };
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error("Failed to fetch clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      tags,
      notes,
    } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "First name, last name, and phone are required" },
        { status: 400 }
      );
    }

    // Check if client already exists
    const existing = await prisma.client.findFirst({
      where: { phone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Client with this phone number already exists" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
        notes: notes?.trim() || null,
      },
    });

    // Emit client.created event
    await emitClientCreated(client);

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error("Failed to create client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
