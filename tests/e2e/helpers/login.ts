/**
 * Deterministic Login Helper
 * 
 * Provides reliable login functions for E2E tests that verify session establishment
 * before expecting navigation redirects.
 */

import { Page, expect } from '@playwright/test';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'password';
const SITTER_EMAIL = process.env.SITTER_EMAIL || 'sitter@example.com';
const SITTER_PASSWORD = process.env.SITTER_PASSWORD || 'password';

/**
 * Login as owner and wait for session to be established
 * 
 * @param page - Playwright page instance
 * @returns Promise that resolves when session is confirmed and redirect is complete
 */
export async function loginAsOwner(page: Page): Promise<void> {
  // Navigate to login
  await page.goto('/login');
  
  // Fill credentials
  await page.fill('input[type="email"]', OWNER_EMAIL);
  await page.fill('input[type="password"]', OWNER_PASSWORD);
  
  // Submit form - wait for navigation to start
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  
  // Verify we're on dashboard
  expect(page.url()).toContain('/dashboard');
  
  // Poll to ensure session is reliably established via API
  await expect.poll(
    async () => {
      const response = await page.request.get('/api/auth/session');
      if (!response.ok()) return false;
      const sessionData = await response.json();
      return sessionData?.user?.email === OWNER_EMAIL;
    },
    { timeout: 5000, intervals: [200, 500, 1000] }
  ).toBeTruthy();
}

/**
 * Login as sitter and wait for session to be established
 * 
 * @param page - Playwright page instance
 * @returns Promise that resolves when session is confirmed and redirect is complete
 */
export async function loginAsSitter(page: Page): Promise<void> {
  // Navigate to login
  await page.goto('/login');
  
  // Fill credentials
  await page.fill('input[type="email"]', SITTER_EMAIL);
  await page.fill('input[type="password"]', SITTER_PASSWORD);
  
  // Submit form - wait for navigation to start
  await Promise.all([
    page.waitForURL('**/sitter/inbox', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  
  // Verify we're on sitter inbox
  expect(page.url()).toContain('/sitter/inbox');
  
  // Poll to ensure session is reliably established via API
  await expect.poll(
    async () => {
      const response = await page.request.get('/api/auth/session');
      if (!response.ok()) return false;
      const sessionData = await response.json();
      return sessionData?.user?.email === SITTER_EMAIL;
    },
    { timeout: 5000, intervals: [200, 500, 1000] }
  ).toBeTruthy();
}
