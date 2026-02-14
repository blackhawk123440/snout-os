/**
 * Playwright Smoke Test Configuration
 * 
 * Runs only the critical proof-pack tests needed for operability verification.
 * Used by pilot:smoke to generate proof-pack artifacts.
 */

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    '**/role-routing.spec.ts',
    '**/messaging-features.spec.ts',
    '**/pool-exhausted-confirmation.spec.ts',
    '**/pool-exhausted-integration.spec.ts',
    '**/rotation-settings-persistence.spec.ts',
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for smoke tests
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  reporter: [
    ['html', { outputFolder: 'proof-pack/playwright-report' }],
    ['list'],
  ],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'owner',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        storageState: path.join(__dirname, 'tests', '.auth', 'owner.json'),
      },
    },
    {
      name: 'sitter',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        storageState: path.join(__dirname, 'tests', '.auth', 'sitter.json'),
      },
    },
  ],

  // webServer: In CI, the server is started manually, so reuseExistingServer will skip starting it
  // For local development, this will start the dev server automatically
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // In CI, server is started manually, so reuse it
    timeout: 180000, // 3 minutes
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://snoutos:snoutos_dev_password@localhost:5432/snoutos_messaging',
      OPENPHONE_API_KEY: process.env.OPENPHONE_API_KEY || 'test_key',
      OPENPHONE_NUMBER_ID: process.env.OPENPHONE_NUMBER_ID || 'test_number_id',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test_secret',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3000',
      ENABLE_OPS_SEED: 'true',
      ENABLE_MESSAGING_V1: 'true',
      NEXT_PUBLIC_ENABLE_MESSAGING_V1: 'true',
    },
  },

});
