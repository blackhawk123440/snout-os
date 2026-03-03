#!/usr/bin/env tsx
/**
 * Single entry point for smoke and a11y tests.
 * - CI: run Playwright only (server started by workflow)
 * - Local: run full harness (db reset → build → server → playwright → teardown)
 *
 * Usage:
 *   pnpm test:ui:smoke     → smoke suite (default)
 *   pnpm test:e2e:a11y     → a11y suite (--a11y)
 */

import { execSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const isA11y = process.argv.includes('--a11y');

const playwrightCmd = isA11y
  ? 'pnpm exec playwright test tests/e2e/a11y-smoke.spec.ts --config=playwright.smoke.config.ts'
  : 'pnpm exec playwright test --config=playwright.smoke.config.ts';

if (process.env.CI === 'true') {
  execSync(playwrightCmd, {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
  });
} else {
  execSync(`tsx scripts/smoke-local.ts ${isA11y ? '--a11y' : ''}`, {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
  });
}
