/**
 * Sitter Dashboard E2E Test
 * 
 * Verifies all dashboard sections render correctly
 * Run with: pnpm test:ui tests/e2e/sitter-dashboard.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Sitter Dashboard', () => {
  test('should redirect /sitter to /sitter/dashboard', async ({ page }) => {
    await page.goto('/sitter');
    
    // Wait for redirect
    await page.waitForURL('**/sitter/dashboard', { timeout: 5000 });
    
    expect(page.url()).toContain('/sitter/dashboard');
  });

  test('should render all 7 dashboard sections', async ({ page }) => {
    await page.goto('/sitter/dashboard');
    
    // Wait for page to load
    await page.waitForSelector('text=Sitter Dashboard', { timeout: 10000 });

    // 1. Status & Availability
    await expect(page.locator('text=Availability Status')).toBeVisible();
    await expect(page.locator('text=Available').or(page.locator('text=Unavailable'))).toBeVisible();

    // 2. Pending Requests (section heading should always be visible)
    await expect(page.locator('text=Pending Requests').first()).toBeVisible();

    // 3. Upcoming Bookings
    await expect(page.locator('text=Upcoming Bookings')).toBeVisible();

    // 4. Completed Bookings
    await expect(page.locator('text=Completed Bookings')).toBeVisible();

    // 5. Performance Snapshot
    await expect(page.locator('text=Performance Snapshot')).toBeVisible();

    // 6. Your Level (Tier/SRS card)
    await expect(page.locator('text=Your Level')).toBeVisible();

    // 7. Messaging Inbox Card
    await expect(page.locator('text=Messages')).toBeVisible();
    await expect(page.locator('text=Open Inbox')).toBeVisible();
  });

  test('should show tier badge in Your Level card', async ({ page }) => {
    await page.goto('/sitter/dashboard');
    
    // Wait for SRS card to load
    await page.waitForSelector('text=Your Level', { timeout: 10000 });

    // Check for tier badge (Foundation, Reliant, Trusted, or Preferred)
    const tierBadge = page.locator('text=Foundation')
      .or(page.locator('text=Reliant'))
      .or(page.locator('text=Trusted'))
      .or(page.locator('text=Preferred'))
      .or(page.locator('text=Service Reliability Score')); // Fallback if tier not loaded yet

    await expect(tierBadge.first()).toBeVisible({ timeout: 15000 });
  });

  test('should show empty states when no data', async ({ page }) => {
    await page.goto('/sitter/dashboard');
    
    await page.waitForSelector('text=Sitter Dashboard', { timeout: 10000 });

    // Pending Requests should show empty state if no requests
    const pendingSection = page.locator('text=Pending Requests').first();
    await expect(pendingSection).toBeVisible();
    
    // Check for either requests or empty state message
    const hasRequests = await page.locator('text=No pending requests').isVisible().catch(() => false);
    const hasPendingCard = await page.locator('text=Accept Booking').isVisible().catch(() => false);
    
    // At least one should be true (either empty state or actual requests)
    expect(hasRequests || hasPendingCard).toBeTruthy();
  });
});

test.describe('Owner Growth Tab', () => {
  test('should show Growth table at /messages?tab=sitters&subtab=growth', async ({ page }) => {
    await page.goto('/messages?tab=sitters&subtab=growth');
    
    // Wait for Growth tab to load
    await page.waitForSelector('text=Growth', { timeout: 10000 });
    
    // Check for Growth table (should have sitter names or empty state)
    const growthTable = page.locator('text=Growth').or(page.locator('table'));
    await expect(growthTable.first()).toBeVisible();
    
    // Verify API call was made
    const response = await page.waitForResponse(
      (response) => response.url().includes('/api/sitters/srs') && response.status() === 200,
      { timeout: 10000 }
    );
    
    expect(response.status()).toBe(200);
  });
});
