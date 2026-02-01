/**
 * Get Numbers Status
 * GET /api/setup/numbers/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    const numbers = await prisma.messageNumber.findMany({
      where: { orgId, status: 'active' },
      select: { id: true, e164: true, numberClass: true },
    });

    const frontDesk = numbers.filter(n => n.numberClass === 'front_desk');
    const sitter = numbers.filter(n => n.numberClass === 'sitter');
    const pool = numbers.filter(n => n.numberClass === 'pool');

    return NextResponse.json({
      hasFrontDesk: frontDesk.length > 0,
      frontDesk: {
        count: frontDesk.length,
        numbers: frontDesk.map(n => ({ e164: n.e164, id: n.id })),
      },
      sitter: {
        count: sitter.length,
        numbers: sitter.map(n => ({ e164: n.e164, id: n.id })),
      },
      pool: {
        count: pool.length,
        numbers: pool.map(n => ({ e164: n.e164, id: n.id })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
