import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const accounts = await prisma.calendarAccount.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch calendar accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, refreshToken, calendarId, sitterId } = body;

    if (!name || !email || !refreshToken) {
      return NextResponse.json(
        { error: "Name, email, and refresh token are required" },
        { status: 400 }
      );
    }

    const account = await prisma.calendarAccount.create({
      data: {
        id: `cal_${Date.now()}`,
        provider: "google",
        email,
        accessToken: "temp_token", // In production, use real token
        refreshToken, // In production, encrypt this!
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Failed to create calendar account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

