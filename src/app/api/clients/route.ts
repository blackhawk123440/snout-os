/**
 * GET /api/clients
 * List clients for the org. Includes soft-deleted (for owner history).
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { requireAnyRole, ForbiddenError } from "@/lib/rbac";
import { getScopedDb } from "@/lib/tenancy";
import { parsePage, parsePageSize } from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
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
  const url = (request as NextRequest).nextUrl ?? new URL(request.url);
  const params = url.searchParams;
  const page = parsePage(params.get("page"), 1);
  const pageSize = parsePageSize(params.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const statusParam = params.get("status")?.trim().toLowerCase();
  const search = params.get("search")?.trim();
  const deletedFilter =
    statusParam === "inactive" ? { not: null } : statusParam === "active" ? null : undefined;

  try {
    const where: Record<string, any> = {};
    if (deletedFilter !== undefined) {
      where.deletedAt = deletedFilter;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await db.client.count({ where });
    const clients = await db.client.findMany({
      where,
      orderBy: [{ lastBookingAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
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

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      sort: { field: "lastBookingAt", direction: "desc" },
      filters: {
        status: statusParam ?? null,
        search: search ?? null,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load clients", message: msg },
      { status: 500 }
    );
  }
}
