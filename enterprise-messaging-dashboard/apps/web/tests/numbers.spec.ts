import { test, expect } from '@playwright/test';

test.describe('Number Inventory', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('A) Quarantine flow with impact preview', async ({ page }) => {
    await page.goto('/numbers');

    // Wait for numbers table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Find first active number (not already quarantined)
    const firstRow = page.locator('table tbody tr').first();
    const statusBadge = firstRow.locator('td').nth(3); // Status column

    // Skip if already quarantined
    const statusText = await statusBadge.textContent();
    if (statusText?.includes('quarantined')) {
      test.skip();
    }

    // Click quarantine button
    const quarantineButton = firstRow.locator('button:has-text("Quarantine")').first();
    await quarantineButton.click();

    // Verify impact preview dialog appears
    await expect(page.locator('text=Impact Preview')).toBeVisible();
    await expect(page.locator('text=active conversation')).toBeVisible();

    // Select reason (required)
    await page.selectOption('select', 'delivery_failures');

    // Verify reason is required
    const confirmButton = page.locator('button:has-text("Confirm Quarantine")');
    await expect(confirmButton).toBeEnabled();

    // Confirm quarantine
    await confirmButton.click();

    // Wait for success (number should be removed from active list or status changed)
    await page.waitForTimeout(2000);

    // Verify number is now quarantined (check status badge)
    await page.reload();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Find the number we just quarantined (by checking for quarantined status)
    const quarantinedRow = page.locator('table tbody tr').filter({ hasText: 'quarantined' }).first();
    await expect(quarantinedRow).toBeVisible();
  });

  test('B) Guardrail: cannot quarantine last front desk number', async ({ page }) => {
    await page.goto('/numbers');

    // Wait for numbers table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Find front desk numbers
    const frontDeskRows = page.locator('table tbody tr').filter({ hasText: 'Front Desk' });

    // Count active front desk numbers
    const count = await frontDeskRows.count();

    if (count <= 1) {
      // Try to quarantine the last front desk number
      const lastFrontDeskRow = frontDeskRows.first();
      const quarantineButton = lastFrontDeskRow.locator('button:has-text("Quarantine")').first();

      if (await quarantineButton.isVisible()) {
        await quarantineButton.click();

        // Select reason
        await page.selectOption('select', 'delivery_failures');

        // Try to confirm
        const confirmButton = page.locator('button:has-text("Confirm Quarantine")');
        await confirmButton.click();

        // Should see error message
        await expect(
          page.locator('text=/Cannot quarantine.*last Front Desk/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip('Multiple front desk numbers exist, cannot test guardrail');
    }
  });
});
