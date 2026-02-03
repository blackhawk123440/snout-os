import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright configuration for visual regression testing
 * UI Constitution V1 - Visual regression harness
 */

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false, // Disable full parallelism to reduce server load
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2, // Limit to 2 workers to reduce server load
  reporter: 'html',
  timeout: 30000, // 30 seconds default test timeout
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 seconds for actions (click, fill, etc.)
    navigationTimeout: 15000, // 15 seconds for navigation
  },

  projects: [
    {
      name: 'owner-mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        storageState: path.join(__dirname, 'tests/.auth/owner.json'),
      },
    },
    {
      name: 'owner-tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
        storageState: path.join(__dirname, 'tests/.auth/owner.json'),
      },
    },
    {
      name: 'owner-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: path.join(__dirname, 'tests/.auth/owner.json'),
      },
    },
    {
      name: 'sitter-mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        storageState: path.join(__dirname, 'tests/.auth/sitter.json'),
      },
    },
    {
      name: 'sitter-tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
        storageState: path.join(__dirname, 'tests/.auth/sitter.json'),
      },
    },
    {
      name: 'sitter-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: path.join(__dirname, 'tests/.auth/sitter.json'),
      },
    },
    // Legacy projects without storageState (for tests that don't need auth)
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://snoutos:snoutos_dev_password@localhost:5432/snoutos_messaging',
      OPENPHONE_API_KEY: process.env.OPENPHONE_API_KEY || 'test_key',
      OPENPHONE_NUMBER_ID: process.env.OPENPHONE_NUMBER_ID || 'test_number_id',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test_secret',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3003',
      ENABLE_OPS_SEED: 'true',
      ENABLE_MESSAGING_V1: 'true',
      NEXT_PUBLIC_ENABLE_MESSAGING_V1: 'true',
    },
  },
});
