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

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'password';
const SITTER_EMAIL = process.env.SITTER_EMAIL || 'sitter@example.com';
const SITTER_PASSWORD = process.env.SITTER_PASSWORD || 'password';

test.describe('Role-Based Routing', () => {
  test('Owner login redirects to /dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', OWNER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Should redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
    
    // Should see logout button
    const logoutButton = page.locator('text=Logout');
    await expect(logoutButton).toBeVisible();
  });

  test('Sitter login redirects to /sitter/inbox', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', SITTER_EMAIL);
    await page.fill('input[type="password"]', SITTER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Should redirect to /sitter/inbox (NOT /dashboard)
    await page.waitForURL('**/sitter/inbox', { timeout: 10000 });
    expect(page.url()).toContain('/sitter/inbox');
    expect(page.url()).not.toContain('/dashboard');
    
    // Should see logout button
    const logoutButton = page.locator('text=Logout');
    await expect(logoutButton).toBeVisible();
  });

  test('Sitter cannot access /messages', async ({ page }) => {
    // Login as sitter
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', SITTER_EMAIL);
    await page.fill('input[type="password"]', SITTER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/sitter/inbox', { timeout: 10000 });
    
    // Try to navigate to /messages
    await page.goto(`${BASE_URL}/messages`);
    
    // Should be redirected back to /sitter/inbox
    await page.waitForURL('**/sitter/inbox', { timeout: 5000 });
    expect(page.url()).toContain('/sitter/inbox');
  });

  test('Logout works for owner', async ({ page }) => {
    // Login as owner
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', OWNER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Click logout
    await page.click('text=Logout');
    
    // Should redirect to /login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('Logout works for sitter', async ({ page }) => {
    // Login as sitter
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', SITTER_EMAIL);
    await page.fill('input[type="password"]', SITTER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/sitter/inbox', { timeout: 10000 });
    
    // Click logout
    await page.click('text=Logout');
    
    // Should redirect to /login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
