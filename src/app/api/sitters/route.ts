import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sitters = await prisma.sitter.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ sitters: sitters || [] });
  } catch (error) {
    console.error("Failed to fetch sitters:", error);
    // Return empty array instead of error to prevent dashboard crash
    return NextResponse.json({ sitters: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, personalPhone, openphonePhone, phoneType, email, isActive } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Determine which phone to use as primary based on phoneType
    let primaryPhone = phone || "";
    if (phoneType === "personal" && personalPhone) {
      primaryPhone = personalPhone;
    } else if (phoneType === "openphone" && openphonePhone) {
      primaryPhone = openphonePhone;
    } else if (personalPhone) {
      primaryPhone = personalPhone;
    } else if (openphonePhone) {
      primaryPhone = openphonePhone;
    }

    // Validate that we have at least one phone number
    if (!primaryPhone) {
      return NextResponse.json(
        { error: "At least one phone number is required" },
        { status: 400 }
      );
    }

    // Create sitter
    const sitter = await prisma.sitter.create({
      data: {
        firstName,
        lastName,
        phone: primaryPhone,
        personalPhone: personalPhone || null,
        openphonePhone: openphonePhone || null,
        phoneType: phoneType || "personal",
        email,
        active: isActive !== false,
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