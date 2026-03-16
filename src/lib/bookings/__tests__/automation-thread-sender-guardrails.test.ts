import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.fn();
const mockSendThreadMessage = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    assignmentWindow: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/messaging/send", () => ({
  sendThreadMessage: (...args: unknown[]) => mockSendThreadMessage(...args),
}));

import { sendAutomationMessageViaThread } from "@/lib/bookings/automation-thread-sender";

describe("automation-thread-sender guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENFORCE_MASKED_ONLY_MESSAGING = "true";
  });

  it("fails closed when masked thread mapping is unavailable", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await sendAutomationMessageViaThread({
      bookingId: "booking-1",
      orgId: "org-1",
      clientId: "client-1",
      message: "Test message",
      recipient: "client",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Masked delivery required");
    expect(mockSendThreadMessage).not.toHaveBeenCalled();
  });

  it("uses thread send path and never raw direct-send fallback", async () => {
    mockFindFirst.mockResolvedValue({
      thread: { id: "thread-1", numberId: "num-1", messageNumber: { id: "num-1" } },
    });
    mockSendThreadMessage.mockResolvedValue({ messageId: "event-1" });

    const result = await sendAutomationMessageViaThread({
      bookingId: "booking-1",
      orgId: "org-1",
      clientId: "client-1",
      message: "Masked thread message",
      recipient: "client",
    });

    expect(result.success).toBe(true);
    expect(result.usedThread).toBe(true);
    expect(mockSendThreadMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        actor: { role: "automation", userId: null },
      })
    );
  });
});
