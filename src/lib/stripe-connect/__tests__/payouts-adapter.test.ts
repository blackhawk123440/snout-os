import { describe, expect, it, vi } from "vitest";
import { requestStripeConnectPayout } from "@/lib/stripe-connect/payouts-adapter";

describe("stripe connect payouts adapter scaffold", () => {
  it("returns disabled and no-ops when flag is off", async () => {
    const observe = vi.fn();
    const result = await requestStripeConnectPayout(
      {
        orgId: "org-1",
        sitterId: "sitter-1",
        bookingId: "booking-1",
        amountCents: 12345,
      },
      { enabled: false, observe }
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("disabled");
    expect(result.reason).toContain("disabled");
    expect(observe).toHaveBeenCalledWith(
      "payout.adapter.skipped",
      expect.objectContaining({
        orgId: "org-1",
        sitterId: "sitter-1",
        amountCents: 12345,
        correlationId: expect.any(String),
      })
    );
  });

  it("accepts dry-run only mode when enabled", async () => {
    const observe = vi.fn();
    const correlationId = "corr-payout-1";
    const result = await requestStripeConnectPayout(
      {
        orgId: "org-1",
        sitterId: "sitter-1",
        bookingId: "booking-1",
        amountCents: 12345,
        correlationId,
      },
      { enabled: true, observe }
    );

    expect(result.accepted).toBe(true);
    expect(result.status).toBe("dry_run_only");
    expect(result.correlationId).toBe(correlationId);
    expect(observe).toHaveBeenCalledWith(
      "payout.adapter.dry_run",
      expect.objectContaining({
        correlationId,
        orgId: "org-1",
        sitterId: "sitter-1",
      })
    );
  });

  it("rejects explicit live execution requests", async () => {
    const observe = vi.fn();
    const result = await requestStripeConnectPayout(
      {
        orgId: "org-1",
        sitterId: "sitter-1",
        amountCents: 1000,
        allowLiveExecution: true,
      },
      { enabled: true, observe }
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected_live_execution");
    expect(result.reason).toContain("blocked");
    expect(observe).toHaveBeenCalledWith(
      "payout.adapter.rejected_live_execution",
      expect.objectContaining({
        orgId: "org-1",
        sitterId: "sitter-1",
        amountCents: 1000,
      })
    );
  });
});
