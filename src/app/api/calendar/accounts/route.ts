import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const accounts = await prisma.calendarAccount.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Failed to fetch calendar accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accessToken, refreshToken, provider } = body;

    // Validate required fields
    if (!email || !accessToken || !provider) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create calendar account
    const account = await prisma.calendarAccount.create({
      data: {
        id: randomUUID(),
        email,
        accessToken,
        refreshToken: refreshToken || null,
        provider,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Failed to create calendar account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}