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

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (typeof isActive === 'boolean') updateData.active = isActive;
    if (primaryPhone) updateData.phone = primaryPhone;
    if (personalPhone !== undefined) updateData.personalPhone = personalPhone || null;
    if (openphonePhone !== undefined) updateData.openphonePhone = openphonePhone || null;
    if (phoneType !== undefined) updateData.phoneType = phoneType || "personal";
    if (commissionPercentage !== undefined) {
      // Validate commission percentage (should be between 0 and 100)
      const percentage = parseFloat(commissionPercentage);
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        updateData.commissionPercentage = percentage;
      }
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
    await prisma.sitter.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sitter:", error);
    return NextResponse.json({ error: "Failed to delete sitter" }, { status: 500 });
  }
}