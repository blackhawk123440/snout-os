import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/bookings/[id]/tags
 * Get tags for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const assignments = await prisma.bookingTagAssignment.findMany({
      where: { bookingId: id },
      include: {
        tag: true,
      },
    });

    return NextResponse.json({
      tags: assignments.map(a => a.tag),
      assignments,
    });
  } catch (error: any) {
    console.error("Failed to fetch booking tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking tags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/tags
 * Add tags to a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tagIds } = body;

    if (!tagIds || !Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: "tagIds array is required" },
        { status: 400 }
      );
    }

    // Create assignments
    const assignments = await Promise.all(
      tagIds.map((tagId: string) =>
        prisma.bookingTagAssignment.upsert({
          where: {
            bookingId_tagId: {
              bookingId: id,
              tagId,
            },
          },
          update: {},
          create: {
            bookingId: id,
            tagId,
          },
        })
      )
    );

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error("Failed to add booking tags:", error);
    return NextResponse.json(
      { error: "Failed to add booking tags" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/[id]/tags
 * Remove tags from a booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");

    if (!tagId) {
      return NextResponse.json(
        { error: "tagId is required" },
        { status: 400 }
      );
    }

    await prisma.bookingTagAssignment.delete({
      where: {
        bookingId_tagId: {
          bookingId: id,
          tagId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to remove booking tag:", error);
    return NextResponse.json(
      { error: "Failed to remove booking tag" },
      { status: 500 }
    );
  }
}


