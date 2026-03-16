import { afterEach, describe, expect, it, vi } from "vitest";

describe("adapter feature flags", () => {
  const originalGoogleFlag = process.env.ENABLE_GOOGLE_BIDIRECTIONAL_SYNC;
  const originalGooglePublicFlag = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_BIDIRECTIONAL_SYNC;
  const originalStripeFlag = process.env.ENABLE_STRIPE_CONNECT_PAYOUTS;
  const originalStripePublicFlag = process.env.NEXT_PUBLIC_ENABLE_STRIPE_CONNECT_PAYOUTS;

  afterEach(() => {
    process.env.ENABLE_GOOGLE_BIDIRECTIONAL_SYNC = originalGoogleFlag;
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_BIDIRECTIONAL_SYNC = originalGooglePublicFlag;
    process.env.ENABLE_STRIPE_CONNECT_PAYOUTS = originalStripeFlag;
    process.env.NEXT_PUBLIC_ENABLE_STRIPE_CONNECT_PAYOUTS = originalStripePublicFlag;
    vi.resetModules();
  });

  it("default to off when env vars are unset", async () => {
    delete process.env.ENABLE_GOOGLE_BIDIRECTIONAL_SYNC;
    delete process.env.NEXT_PUBLIC_ENABLE_GOOGLE_BIDIRECTIONAL_SYNC;
    delete process.env.ENABLE_STRIPE_CONNECT_PAYOUTS;
    delete process.env.NEXT_PUBLIC_ENABLE_STRIPE_CONNECT_PAYOUTS;
    vi.resetModules();

    const flags = await import("@/lib/flags");
    expect(flags.ENABLE_GOOGLE_BIDIRECTIONAL_SYNC).toBe(false);
    expect(flags.ENABLE_STRIPE_CONNECT_PAYOUTS).toBe(false);
  });
});
