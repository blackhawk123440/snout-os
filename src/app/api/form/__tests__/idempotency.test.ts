import { beforeEach, describe, expect, it, vi } from "vitest";

type IdempotencyRow = {
  id: string;
  orgId: string;
  route: string;
  idempotencyKey: string;
  requestFingerprint: string;
  statusCode: number | null;
  responseBodyJson: string | null;
};

const idempotencyRows = new Map<string, IdempotencyRow>();
let bookingCreateCount = 0;

const makeIdempotencyKey = (orgId: string, route: string, key: string) => `${orgId}:${route}:${key}`;

vi.mock("@/lib/request-context", () => ({
  getPublicOrgContext: vi.fn(() => ({ orgId: "personal-org" })),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      create: vi.fn(async () => {
        bookingCreateCount += 1;
        return {
          id: "booking-1",
          status: "pending",
          notes: null,
          pets: [],
          timeSlots: [],
          service: "Dog Walking",
          firstName: "A",
          lastName: "B",
          phone: "+15555555555",
          clientId: null,
          sitterId: null,
        };
      }),
    },
    bookingRequestIdempotency: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.id) {
          return [...idempotencyRows.values()].find((row) => row.id === where.id) ?? null;
        }
        const lookup = where?.org_route_idempotency;
        if (!lookup) return null;
        return idempotencyRows.get(makeIdempotencyKey(lookup.orgId, lookup.route, lookup.idempotencyKey)) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const key = makeIdempotencyKey(data.orgId, data.route, data.idempotencyKey);
        if (idempotencyRows.has(key)) {
          throw { code: "P2002" };
        }
        const row: IdempotencyRow = {
          id: `idem-${idempotencyRows.size + 1}`,
          orgId: data.orgId,
          route: data.route,
          idempotencyKey: data.idempotencyKey,
          requestFingerprint: data.requestFingerprint,
          statusCode: null,
          responseBodyJson: null,
        };
        idempotencyRows.set(key, row);
        return { id: row.id };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = [...idempotencyRows.values()].find((r) => r.id === where.id);
        if (!row) throw new Error("row not found");
        row.statusCode = data.statusCode;
        row.responseBodyJson = data.responseBodyJson;
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const row = [...idempotencyRows.values()].find((r) => r.id === where.id && r.statusCode === null);
        if (!row) return { count: 0 };
        const key = makeIdempotencyKey(row.orgId, row.route, row.idempotencyKey);
        idempotencyRows.delete(key);
        return { count: 1 };
      }),
    },
  },
}));

vi.mock("@/lib/rates", () => ({
  calculateBookingPrice: vi.fn(async () => ({ holidayApplied: false })),
}));

vi.mock("@/lib/booking-utils", () => ({
  formatPetsByQuantity: vi.fn(),
  calculatePriceBreakdown: vi.fn(() => ({ total: 42 })),
  formatDatesAndTimesForMessage: vi.fn(),
  formatDateForMessage: vi.fn(),
  formatTimeForMessage: vi.fn(),
}));

vi.mock("@/lib/form-to-booking-mapper", () => ({
  validateAndMapFormPayload: vi.fn((payload: any) => ({
    success: true,
    input: {
      firstName: payload?.firstName || "A",
      lastName: "B",
      phone: "+15555555555",
      service: "Dog Walking",
      startAt: new Date("2026-02-01T10:00:00.000Z"),
      endAt: new Date("2026-02-01T10:30:00.000Z"),
      pets: [{ name: "Rex", species: "Dog" }],
      quantity: 1,
      afterHours: false,
    },
    report: {},
  })),
}));

vi.mock("@/lib/form-mapper-helpers", () => ({
  extractRequestMetadata: vi.fn(() => ({})),
  redactMappingReport: vi.fn((v) => v),
}));

vi.mock("@/lib/event-emitter", () => ({
  emitBookingCreated: vi.fn(async () => undefined),
}));

vi.mock("@/lib/booking/booking-events", () => ({
  emitAndEnqueueBookingEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/event-queue-bridge-init", () => ({
  ensureEventQueueBridge: vi.fn(async () => undefined),
}));

vi.mock("@/lib/calendar-queue", () => ({
  enqueueCalendarSync: vi.fn(async () => null),
}));

vi.mock("@/lib/env", () => ({
  env: {
    ENABLE_FORM_MAPPER_V1: true,
    USE_PRICING_ENGINE_V1: false,
  },
}));

vi.mock("@/lib/pricing-parity-harness", () => ({
  compareAndLogPricing: vi.fn(),
}));

import { POST } from "@/app/api/form/route";

describe("POST /api/form idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idempotencyRows.clear();
    bookingCreateCount = 0;
  });

  it("same key + same body creates one booking and replays response", async () => {
    const req1 = new Request("http://localhost/api/form", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem-1",
      },
      body: JSON.stringify({ firstName: "A" }),
    });
    const req2 = new Request("http://localhost/api/form", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem-1",
      },
      body: JSON.stringify({ firstName: "A" }),
    });

    const [res1, res2] = await Promise.all([POST(req1 as any), POST(req2 as any)]);
    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(body1.booking.id).toBe("booking-1");
    expect(body2.booking.id).toBe("booking-1");
    expect(bookingCreateCount).toBe(1);
  });

  it("same key + different fingerprint returns 409", async () => {
    const req1 = new Request("http://localhost/api/form", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem-2",
      },
      body: JSON.stringify({ firstName: "A" }),
    });
    const req2 = new Request("http://localhost/api/form", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem-2",
      },
      body: JSON.stringify({ firstName: "Different" }),
    });

    const res1 = await POST(req1 as any);
    const res2 = await POST(req2 as any);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(409);
  });

  it("no idempotency key keeps current behavior", async () => {
    const req1 = new Request("http://localhost/api/form", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: "A" }),
    });
    const req2 = new Request("http://localhost/api/form", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: "A" }),
    });

    const res1 = await POST(req1 as any);
    const res2 = await POST(req2 as any);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(bookingCreateCount).toBe(2);
  });
});
