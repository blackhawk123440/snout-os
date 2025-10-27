import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({
      include: {
        booking: {
          include: {
            pets: true,
            sitter: true,
          },
        },
        calendarAccount: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch owner events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}