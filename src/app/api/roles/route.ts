import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/roles
 * Get all roles
 */
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ roles });
  } catch (error: any) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, displayName, permissions } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and displayName are required" },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        permissions: {
          create: (permissions || []).map((p: any) => ({
            resource: p.resource,
            action: p.action,
            granted: p.granted !== false,
          })),
        },
      },
      include: {
        permissions: true,
      },
    });

    return NextResponse.json({ role });
  } catch (error: any) {
    console.error("Failed to create role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}



