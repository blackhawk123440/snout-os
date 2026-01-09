import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sitter = await prisma.sitter.findUnique({
      where: { id },
      include: {
        currentTier: true,
        bookings: {
          include: {
            pets: true,
          },
        },
      },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    return NextResponse.json({ sitter });
  } catch (error) {
    console.error("Failed to fetch sitter:", error);
    return NextResponse.json({ error: "Failed to fetch sitter" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if sitter exists
    const existingSitter = await prisma.sitter.findUnique({
      where: { id },
    });

    if (!existingSitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, personalPhone, openphonePhone, phoneType, email, isActive, commissionPercentage } = body;

    // Determine which phone to use as primary based on phoneType
    let primaryPhone = phone;
    if (phoneType === "personal" && personalPhone) {
      primaryPhone = personalPhone;
    } else if (phoneType === "openphone" && openphonePhone) {
      primaryPhone = openphonePhone;
    } else if (personalPhone) {
      primaryPhone = personalPhone;
    } else if (openphonePhone) {
      primaryPhone = openphonePhone;
    }

    // Validate email if provided
    if (email !== undefined) {
      const trimmedEmail = email?.trim();
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          return NextResponse.json(
            { error: "Invalid email format" },
            { status: 400 }
          );
        }
      }
    }

    // Validate phone number format if provided
    if (primaryPhone) {
      const phoneRegex = /^[\d\s\-\(\)+]+$/;
      if (!phoneRegex.test(primaryPhone.trim())) {
        return NextResponse.json(
          { error: "Invalid phone number format" },
          { status: 400 }
        );
      }
    }

    // Validate commission percentage if provided
    if (commissionPercentage !== undefined) {
      const percentage = typeof commissionPercentage === 'number' 
        ? commissionPercentage 
        : parseFloat(String(commissionPercentage));
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return NextResponse.json(
          { error: "Commission percentage must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (typeof isActive === 'boolean') updateData.active = isActive;
    if (primaryPhone) updateData.phone = primaryPhone.trim();
    if (personalPhone !== undefined) updateData.personalPhone = personalPhone ? personalPhone.trim() : null;
    if (openphonePhone !== undefined) updateData.openphonePhone = openphonePhone ? openphonePhone.trim() : null;
    if (phoneType !== undefined) updateData.phoneType = phoneType || "personal";
    if (commissionPercentage !== undefined) {
      const percentage = typeof commissionPercentage === 'number' 
        ? commissionPercentage 
        : parseFloat(String(commissionPercentage));
      updateData.commissionPercentage = percentage;
    }

    const sitter = await prisma.sitter.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ sitter });
  } catch (error) {
    console.error("Failed to update sitter:", error);
    return NextResponse.json({ error: "Failed to update sitter" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if sitter exists
    const sitter = await prisma.sitter.findUnique({
      where: { id },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Check if sitter has active bookings
    const activeBookings = await prisma.booking.findMany({
      where: {
        sitterId: id,
        status: {
          in: ["pending", "confirmed"],
        },
      },
    });

    if (activeBookings.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete sitter with active bookings",
          activeBookings: activeBookings.length
        },
        { status: 400 }
      );
    }

    await prisma.sitter.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete sitter:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete sitter",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}