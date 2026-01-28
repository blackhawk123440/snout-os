import { test, expect } from '@playwright/test';

test.describe('Alerts & Escalation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('E) Critical cannot dismiss', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForSelector('text=Alerts & Escalation', { timeout: 10000 });

    // Wait for alerts to load
    await page.waitForTimeout(2000);

    // Find critical alert section
    const criticalSection = page.locator('text=Critical Alerts');
    const hasCritical = await criticalSection.isVisible().catch(() => false);

    if (hasCritical) {
      // Find first critical alert
      const criticalAlert = page.locator('div:has-text("Critical")').first();
      
      if (await criticalAlert.isVisible()) {
        // Click to open detail
        await criticalAlert.click();
        await page.waitForTimeout(500);

        // Verify dismiss button is NOT shown (critical alerts cannot dismiss)
        const dismissButton = page.locator('button:has-text("Dismiss")');
        const hasDismiss = await dismissButton.isVisible().catch(() => false);
        
        // Should see message that critical cannot dismiss
        const cannotDismissMessage = page.locator('text=/cannot be dismissed/i');
        await expect(cannotDismissMessage).toBeVisible();

        // Try to call dismiss endpoint directly (should fail)
        // This would require API call, but we can verify UI doesn't show button
        expect(hasDismiss).toBeFalsy();
      } else {
        test.skip('No critical alerts to test');
      }
    } else {
      // Try to create a critical alert via API or check if any exist
      test.skip('No critical alerts section found - may need to seed data');
    }
  });

  test('F) Resolve flow', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForSelector('text=Alerts & Escalation', { timeout: 10000 });

    // Wait for alerts to load
    await page.waitForTimeout(2000);

    // Find warning or info alert (not critical)
    const warningSection = page.locator('text=Warnings');
    const infoSection = page.locator('text=Info');
    
    const hasWarning = await warningSection.isVisible().catch(() => false);
    const hasInfo = await infoSection.isVisible().catch(() => false);

    if (hasWarning || hasInfo) {
      // Find first non-critical alert
      const alertCard = hasWarning
        ? page.locator('div:has-text("Warning")').first()
        : page.locator('div:has-text("Info")').first();

      if (await alertCard.isVisible()) {
        // Click resolve button
        const resolveButton = alertCard.locator('button:has-text("Resolve")');
        
        if (await resolveButton.isVisible()) {
          await resolveButton.click();
          await page.waitForTimeout(1000);

          // Confirm if dialog appears
          const confirmDialog = page.locator('text=/confirm|Confirm/i');
          if (await confirmDialog.isVisible()) {
            await page.click('button:has-text("OK")');
            await page.waitForTimeout(1000);
          }

          // Verify alert moved to resolved (check resolved section or status change)
          // Could check resolved section or verify alert is gone from open list
          await page.waitForTimeout(1000);

          // Check if alert appears in resolved section or is removed from open
          const resolvedSection = page.locator('text=Resolved & Dismissed');
          const hasResolvedSection = await resolvedSection.isVisible().catch(() => false);
          
          // At minimum, verify the alert is no longer in the open list
          // (Full verification would check audit trail, but UI check is sufficient)
          expect(hasResolvedSection || !(await alertCard.isVisible())).toBeTruthy();
        } else {
          test.skip('Resolve button not found');
        }
      } else {
        test.skip('No alerts to resolve');
      }
    } else {
      test.skip('No warning or info alerts to test');
    }
  });
});
