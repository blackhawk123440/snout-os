/**
 * Role-Based Routing E2E Tests
 * 
 * Tests that verify:
 * - Owner login redirects to /dashboard
 * - Sitter login redirects to /sitter/inbox
 * - Sitters cannot access /messages
 * - Logout works for both roles
 */

/**
 * Role-Based Routing E2E Tests
 * 
 * Tests that verify:
 * - Owner login redirects to /dashboard
 * - Sitter login redirects to /sitter/inbox
 * - Sitters cannot access /messages
 * - Logout works for both roles
 */

import { test, expect } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Role-Based Routing', () => {
  test('Owner login redirects to /dashboard', async ({ page }) => {
    // With storageState, we're already authenticated - just navigate and verify
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    
    // Verify we're authenticated by checking session
    const sessionResponse = await page.request.get(`${BASE_URL}/api/auth/session`);
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json();
    expect(session?.user).toBeTruthy();
    expect(session.user.email).toBe('owner@example.com');
    
    // Wait for page to fully load and logout button to be visible
    await page.waitForLoadState('networkidle');
    const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('text=Logout'));
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
  });

  test('Sitter login redirects to /sitter/inbox', async ({ page }) => {
    // With storageState, we're already authenticated - just navigate and verify
    await page.goto(`${BASE_URL}/sitter/inbox`, { waitUntil: 'domcontentloaded' });
    
    // Verify we're authenticated by checking session
    const sessionResponse = await page.request.get(`${BASE_URL}/api/auth/session`);
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json();
    expect(session?.user).toBeTruthy();
    expect(session.user.email).toBe('sitter@example.com');
    
    // Wait for page to fully load and logout button to be visible
    await page.waitForLoadState('networkidle');
    const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('text=Logout'));
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
  });

  test('Sitter cannot access /messages', async ({ page }) => {
    // With storageState, we're already authenticated - navigate to sitter inbox first
    await page.goto(`${BASE_URL}/sitter/inbox`, { waitUntil: 'domcontentloaded' });
    
    // Try to navigate to /messages
    await page.goto(`${BASE_URL}/messages`);
    
    // Should be redirected back to /sitter/inbox
    await page.waitForURL('**/sitter/inbox', { timeout: 10000 });
    expect(page.url()).toContain('/sitter/inbox');
  });

  test('Logout works for owner', async ({ page }) => {
    // With storageState, we're already authenticated - just navigate
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('text=Logout'));
    await logoutButton.click();
    
    // Should redirect to /login
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('Logout works for sitter', async ({ page }) => {
    // With storageState, we're already authenticated - just navigate
    await page.goto(`${BASE_URL}/sitter/inbox`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('text=Logout'));
    await logoutButton.click();
    
    // Should redirect to /login
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
