import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get client
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get client bookings
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { clientId: id },
          { email: client.email },
          { phone: client.phone },
        ],
      },
      include: {
        pets: true,
        sitter: {
          include: {
            currentTier: {
              select: {
                id: true,
                name: true,
                priorityLevel: true,
              },
            },
          },
        },
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    // Calculate totals
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const upcomingBookings = bookings.filter(b => 
      b.status !== 'cancelled' && 
      b.status !== 'completed' &&
      new Date(b.startAt) > new Date()
    ).length;

    return NextResponse.json({
      client,
      bookings,
      stats: {
        totalBookings,
        totalRevenue,
        completedBookings,
        upcomingBookings,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client data" },
      { status: 500 }
    );
  }
}
