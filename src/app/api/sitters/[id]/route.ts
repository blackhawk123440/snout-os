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
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: "Sitter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ sitter }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch sitter:", error);
    return NextResponse.json(
      { error: "Failed to fetch sitter" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phone, notes, active } = body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (notes !== undefined) updateData.notes = notes;
    if (active !== undefined) updateData.active = active;

    const sitter = await prisma.sitter.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ sitter }, { status: 200 });
  } catch (error) {
    console.error("Failed to update sitter:", error);
    return NextResponse.json(
      { error: "Failed to update sitter" },
      { status: 500 }
    );
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete sitter:", error);
    return NextResponse.json(
      { error: "Failed to delete sitter" },
      { status: 500 }
    );
  }
}

