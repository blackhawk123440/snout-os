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
  
  // Submit form and wait for session response
  const [sessionResponse] = await Promise.all([
    page.waitForResponse(
      (response) => 
        response.url().includes('/api/auth/session') && 
        response.status() === 200,
      { timeout: 10000 }
    ),
    page.click('button[type="submit"]'),
  ]);
  
  // Verify session response contains user object
  const sessionData = await sessionResponse.json();
  expect(sessionData?.user).toBeTruthy();
  expect(sessionData.user.email).toBe(OWNER_EMAIL);
  
  // Poll to ensure session is reliably established
  await expect.poll(
    async () => {
      const response = await page.request.get('/api/auth/session');
      return response.ok();
    },
    { timeout: 5000 }
  ).toBeTruthy();
  
  // Now wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  expect(page.url()).toContain('/dashboard');
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
  
  // Submit form and wait for session response
  const [sessionResponse] = await Promise.all([
    page.waitForResponse(
      (response) => 
        response.url().includes('/api/auth/session') && 
        response.status() === 200,
      { timeout: 10000 }
    ),
    page.click('button[type="submit"]'),
  ]);
  
  // Verify session response contains user object
  const sessionData = await sessionResponse.json();
  expect(sessionData?.user).toBeTruthy();
  expect(sessionData.user.email).toBe(SITTER_EMAIL);
  
  // Poll to ensure session is reliably established
  await expect.poll(
    async () => {
      const response = await page.request.get('/api/auth/session');
      return response.ok();
    },
    { timeout: 5000 }
  ).toBeTruthy();
  
  // Now wait for redirect to sitter inbox
  await page.waitForURL('**/sitter/inbox', { timeout: 10000 });
  expect(page.url()).toContain('/sitter/inbox');
}
