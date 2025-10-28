import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sitters = await prisma.sitter.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ sitters });
  } catch (error) {
    console.error("Failed to fetch sitters:", error);
    return NextResponse.json({ error: "Failed to fetch sitters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, email, active } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create sitter
    const sitter = await prisma.sitter.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        active: active !== false,
      },
    });

    return NextResponse.json({ sitter });
  } catch (error) {
    console.error("Failed to create sitter:", error);
    return NextResponse.json(
      { error: "Failed to create sitter" },
      { status: 500 }
    );
  }
}