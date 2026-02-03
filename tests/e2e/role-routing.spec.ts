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
import { loginAsOwner, loginAsSitter } from './helpers/login';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Role-Based Routing', () => {
  test('Owner login redirects to /dashboard', async ({ page }) => {
    await loginAsOwner(page);
    
    // Should see logout button
    const logoutButton = page.locator('text=Logout');
    await expect(logoutButton).toBeVisible();
  });

  test('Sitter login redirects to /sitter/inbox', async ({ page }) => {
    await loginAsSitter(page);
    
    // Should see logout button
    const logoutButton = page.locator('text=Logout');
    await expect(logoutButton).toBeVisible();
  });

  test('Sitter cannot access /messages', async ({ page }) => {
    await loginAsSitter(page);
    
    // Try to navigate to /messages
    await page.goto(`${BASE_URL}/messages`);
    
    // Should be redirected back to /sitter/inbox
    await page.waitForURL('**/sitter/inbox', { timeout: 5000 });
    expect(page.url()).toContain('/sitter/inbox');
  });

  test('Logout works for owner', async ({ page }) => {
    await loginAsOwner(page);
    
    // Click logout
    await page.click('text=Logout');
    
    // Should redirect to /login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('Logout works for sitter', async ({ page }) => {
    await loginAsSitter(page);
    
    // Click logout
    await page.click('text=Logout');
    
    // Should redirect to /login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
