#!/usr/bin/env tsx
/**
 * Single entry point for smoke tests.
 * - CI: run Playwright only (server started by workflow)
 * - Local: run full harness (db reset → server → playwright → teardown)
 */

import { execSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

if (process.env.CI === 'true') {
  // CI: workflow already started server; run Playwright
  execSync('pnpm exec playwright test --config=playwright.smoke.config.ts', {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
  });
} else {
  // Local: full harness
  execSync('tsx scripts/smoke-local.ts', {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
  });
}
