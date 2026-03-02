/**
 * GET /api/clients
 * List clients for the org. Includes soft-deleted (for owner history).
 */

import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { requireAnyRole, ForbiddenError } from "@/lib/rbac";
import { getScopedDb } from "@/lib/tenancy";

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ["owner", "admin"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getScopedDb(ctx);

  try {
    const clients = await db.client.findMany({
      where: {},
      orderBy: { lastBookingAt: "desc" },
      include: {
        bookings: {
          take: 1,
          orderBy: { startAt: "desc" },
          select: { startAt: true },
        },
        _count: { select: { bookings: true } },
      },
    });

    const items = clients.map((c) => {
      const lastBooking = c.bookings[0];
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        address: c.address,
        lastBooking: lastBooking?.startAt ?? null,
        totalBookings: c._count.bookings,
        deletedAt: c.deletedAt,
      };
    });

    return NextResponse.json({ clients: items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load clients", message: msg },
      { status: 500 }
    );
  }
}
