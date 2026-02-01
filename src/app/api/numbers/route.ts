/**
 * Numbers API Endpoint
 * 
 * GET /api/numbers - List all numbers
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);
    const { searchParams } = new URL(request.url);
    
    const classFilter = searchParams.get('class');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { orgId };
    
    if (classFilter) {
      where.numberClass = classFilter;
    }
    
    if (statusFilter) {
      where.status = statusFilter;
    }
    
    if (search) {
      where.OR = [
        { e164: { contains: search } },
      ];
    }

    const numbers = await prisma.messageNumber.findMany({
      where,
      include: {
        assignedSitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(numbers.map(n => ({
      id: n.id,
      e164: n.e164,
      class: n.numberClass,
      status: n.status,
      assignedSitterId: n.assignedSitterId,
      assignedSitter: n.assignedSitter ? {
        id: n.assignedSitter.id,
        name: `${n.assignedSitter.firstName} ${n.assignedSitter.lastName}`,
      } : null,
      providerType: n.providerType,
      providerNumberSid: n.providerNumberSid,
      purchaseDate: n.purchaseDate?.toISOString(),
      lastUsedAt: n.lastAssignedAt?.toISOString(),
    })));
  } catch (error: any) {
    console.error("[numbers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch numbers" },
      { status: 500 }
    );
  }
}
