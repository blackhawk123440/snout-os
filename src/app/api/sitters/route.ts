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
  } catch (error: unknown) {
    console.error("Failed to fetch sitters:", error);
    // Return empty array with proper error status
    return NextResponse.json({ 
      sitters: [],
      error: "Failed to fetch sitters",
      details: error instanceof Error ? error.message : "Unknown database error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, personalPhone, openphonePhone, phoneType, email, isActive, commissionPercentage } = body;

    // Validate required fields with trimming
    const trimmedFirstName = firstName?.trim();
    const trimmedLastName = lastName?.trim();
    const trimmedEmail = email?.trim();
    
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Validate commission percentage if provided
    let commission = 80.0; // Default
    if (commissionPercentage !== undefined) {
      const percentage = typeof commissionPercentage === 'number' 
        ? commissionPercentage 
        : parseFloat(String(commissionPercentage));
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        commission = percentage;
      } else {
        return NextResponse.json(
          { error: "Commission percentage must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // Validate phone number format
    const phoneRegex = /^[\d\s\-\(\)+]+$/;
    if (primaryPhone && !phoneRegex.test(primaryPhone.trim())) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Create sitter
    const sitter = await prisma.sitter.create({
      data: {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phone: primaryPhone.trim(),
        personalPhone: personalPhone ? personalPhone.trim() : null,
        openphonePhone: openphonePhone ? openphonePhone.trim() : null,
        phoneType: phoneType || "personal",
        email: trimmedEmail,
        active: isActive !== false,
        commissionPercentage: commission,
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