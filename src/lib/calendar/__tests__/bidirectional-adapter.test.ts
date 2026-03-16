import { describe, expect, it, vi } from "vitest";
import {
  processInboundReconcileJob,
  type InboundExternalEvent,
} from "@/lib/calendar/bidirectional-adapter";

describe("calendar bidirectional adapter scaffold", () => {
  it("no-ops safely when disabled", async () => {
    const observe = vi.fn();
    const result = await processInboundReconcileJob(
      {
        orgId: "org-1",
        sitterId: "sitter-1",
        events: [
          { externalEventId: "evt-1", action: "moved" },
          { externalEventId: "evt-2", action: "deleted" },
        ],
      },
      { enabled: false, observe }
    );

    expect(result.status).toBe("disabled");
    expect(result.movedDetected).toBe(0);
    expect(result.deletedDetected).toBe(0);
    expect(result.duplicatePrevented).toBe(0);
    expect(result.conflictCandidates).toBe(0);
    expect(observe).toHaveBeenCalledWith(
      "calendar.inbound.skipped",
      expect.objectContaining({
        orgId: "org-1",
        sitterId: "sitter-1",
        reason: "flag_disabled",
        correlationId: expect.any(String),
      })
    );
  });

  it("preserves correlation id and emits observability placeholders when enabled", async () => {
    const observe = vi.fn();
    const events: InboundExternalEvent[] = [
      { externalEventId: "evt-1", action: "moved", updatedAt: "2026-03-11T10:00:00Z" },
      { externalEventId: "evt-1", action: "moved", updatedAt: "2026-03-11T10:00:00Z" }, // duplicate
      { externalEventId: "evt-2", action: "deleted", updatedAt: "2026-03-11T11:00:00Z" },
      { externalEventId: "evt-3", action: "upserted", updatedAt: "2026-03-11T12:00:00Z" },
    ];
    const correlationId = "corr-test-1";

    const result = await processInboundReconcileJob(
      {
        orgId: "org-1",
        sitterId: "sitter-1",
        correlationId,
        events,
      },
      { enabled: true, observe }
    );

    expect(result.status).toBe("processed");
    expect(result.correlationId).toBe(correlationId);
    expect(result.movedDetected).toBe(1);
    expect(result.deletedDetected).toBe(1);
    expect(result.duplicatePrevented).toBe(1);
    expect(result.conflictCandidates).toBe(1);

    expect(observe).toHaveBeenCalledWith(
      "calendar.inbound.event_moved",
      expect.objectContaining({ correlationId, externalEventId: "evt-1" })
    );
    expect(observe).toHaveBeenCalledWith(
      "calendar.inbound.event_deleted",
      expect.objectContaining({ correlationId, externalEventId: "evt-2" })
    );
    expect(observe).toHaveBeenCalledWith(
      "calendar.inbound.conflict_marking.placeholder",
      expect.objectContaining({ correlationId, conflictCandidates: 1 })
    );
  });
});
