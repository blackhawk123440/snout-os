import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/request-context", () => ({
  getRequestContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai", () => ({
  ai: {
    generateDailyDelight: vi.fn(),
  },
}));

import { POST } from "@/app/api/bookings/[id]/daily-delight/route";
import { getRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/db";
import { ai } from "@/lib/ai";

describe("daily delight tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes booking read by orgId", async () => {
    (getRequestContext as any).mockResolvedValue({
      orgId: "org-a",
      role: "owner",
      sitterId: null,
      userId: "u1",
    });
    (prisma as any).booking.findUnique.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "booking-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Booking not found");
    expect((prisma as any).booking.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "booking-1", orgId: "org-a" }),
      })
    );
  });

  it("blocks sitter from accessing another sitter booking", async () => {
    (getRequestContext as any).mockResolvedValue({
      orgId: "org-a",
      role: "sitter",
      sitterId: "sitter-1",
      userId: "u2",
    });
    (prisma as any).booking.findUnique.mockResolvedValue({
      id: "booking-1",
      orgId: "org-a",
      sitterId: "sitter-2",
      pets: [{ id: "pet-1" }],
      client: null,
    });
    (ai as any).generateDailyDelight.mockResolvedValue("report");

    const response = await POST(new Request("http://localhost") as any, {
      params: Promise.resolve({ id: "booking-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });
});
