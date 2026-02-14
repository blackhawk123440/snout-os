import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ['./vitest.setup.ts'],
    // Exclude E2E and integration tests from default run
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/tests/e2e/**",
      "**/tests/visual/**",
      // Integration tests require external services - run separately
      ...(process.env.RUN_INTEGRATION_TESTS !== 'true' ? [
        "**/*integration*.test.ts",
        "**/__tests__/*integration*.test.ts",
        "**/__tests__/messaging-integration.test.ts",
        "**/__tests__/phase-*-integration.test.ts",
        "**/__tests__/webhook-negative.test.ts",
        "**/__tests__/master-spec-anti-poaching.test.ts",
      ] : []),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

