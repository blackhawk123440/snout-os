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

});
