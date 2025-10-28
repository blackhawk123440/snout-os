import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sitter = await prisma.sitter.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, email, active } = body;

    const sitter = await prisma.sitter.update({
      where: { id: params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(typeof active === 'boolean' && { active }),
      },
    });

    return NextResponse.json({ sitter });
  } catch (error) {
    console.error("Failed to update sitter:", error);
    return NextResponse.json({ error: "Failed to update sitter" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.sitter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sitter:", error);
    return NextResponse.json({ error: "Failed to delete sitter" }, { status: 500 });
  }
}