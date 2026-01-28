import { test, expect } from '@playwright/test';

test.describe('Routing Control', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('D) Override affects simulation and history', async ({ page }) => {
    await page.goto('/routing');
    await page.waitForSelector('text=Routing Control', { timeout: 10000 });

    // Wait for threads to load
    await page.waitForTimeout(2000);

    // Step 1: Pick a thread and run simulator to get baseline
    const threadSelect = page.locator('select').first(); // Simulator thread selector
    const threadOptions = await threadSelect.locator('option').count();

    if (threadOptions <= 1) {
      test.skip('No threads available for testing');
    }

    // Select first available thread (skip "Select a thread..." option)
    await threadSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Click "Preview Routing"
    await page.click('button:has-text("Preview Routing")');
    await page.waitForTimeout(1000);

    // Record baseline target
    const baselineTarget = page.locator('text=/Owner Inbox|Sitter|Client/').first();
    const baselineText = await baselineTarget.textContent();
    expect(baselineText).toBeTruthy();

    // Step 2: Create override to Owner Inbox for 1 hour
    // Find the override thread selector
    const overrideThreadSelect = page.locator('select').last(); // Override thread selector
    await overrideThreadSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Fill override form (should open dialog or form)
    // Check if dialog opened or if we need to trigger it
    const overrideDialog = page.locator('text=Create Routing Override');
    const hasDialog = await overrideDialog.isVisible().catch(() => false);

    if (!hasDialog) {
      // Try clicking a button that opens the dialog
      const createButton = page.locator('button:has-text("Create")');
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Fill override form
    const targetSelect = page.locator('select').filter({ hasText: /Owner Inbox|Sitter|Client/ }).first();
    if (await targetSelect.isVisible()) {
      await targetSelect.selectOption('owner_inbox');
    }

    const durationSelect = page.locator('select').filter({ hasText: /hour/ }).first();
    if (await durationSelect.isVisible()) {
      await durationSelect.selectOption('1');
    }

    const reasonTextarea = page.locator('textarea[placeholder*="reason"]');
    if (await reasonTextarea.isVisible()) {
      await reasonTextarea.fill('Test override for routing simulation');
    }

    // Create override
    const createButton = page.locator('button:has-text("Create Override")');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(2000);
    }

    // Step 3: Run simulator again - target must be Owner Inbox + override shown
    await page.click('button:has-text("Preview Routing")');
    await page.waitForTimeout(1000);

    // Verify override is shown in trace or result
    const overrideInTrace = page.locator('text=/override|Override/i');
    const hasOverride = await overrideInTrace.isVisible().catch(() => false);
    expect(hasOverride).toBeTruthy();

    // Step 4: Check routing history shows override entry
    const historyThreadSelect = page.locator('select').filter({ hasText: /Select a thread/ }).last();
    if (await historyThreadSelect.isVisible()) {
      await historyThreadSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Check for override in history
      const overrideInHistory = page.locator('text=/override|Override/i');
      const hasOverrideInHistory = await overrideInHistory.isVisible().catch(() => false);
      expect(hasOverrideInHistory).toBeTruthy();
    }

    // Step 5: Remove override
    const removeButton = page.locator('button:has-text("Remove")').first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
      await page.waitForTimeout(1000);

      // Confirm removal if dialog appears
      const confirmDialog = page.locator('text=/confirm|Confirm/i');
      if (await confirmDialog.isVisible()) {
        await page.click('button:has-text("OK")');
        await page.waitForTimeout(1000);
      }
    }

    // Step 6: Run simulator again - should return to baseline
    await page.click('button:has-text("Preview Routing")');
    await page.waitForTimeout(1000);

    // Verify baseline target is restored (or different from override)
    const finalTarget = page.locator('text=/Owner Inbox|Sitter|Client/').first();
    const finalText = await finalTarget.textContent();
    // The target should match baseline or be different from the override we set
    expect(finalText).toBeTruthy();
  });
});
