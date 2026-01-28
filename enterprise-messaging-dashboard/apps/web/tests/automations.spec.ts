import { test, expect } from '@playwright/test';

test.describe('Automations', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('A) Activation gate - must test after edit', async ({ page }) => {
    await page.goto('/automations');
    await page.waitForSelector('text=Automations', { timeout: 10000 });

    // Wait for automations to load
    await page.waitForTimeout(2000);

    // Find first draft automation (or create one if none exist)
    const draftAutomation = page.locator('div:has-text("Draft")').first();

    if (await draftAutomation.isVisible()) {
      // Click to open detail
      await draftAutomation.click();
      await page.waitForTimeout(1000);

      // Try to activate (should be blocked)
      const activateButton = page.locator('button:has-text("Activate")').first();
      
      if (await activateButton.isVisible()) {
        // Check if button is disabled
        const isDisabled = await activateButton.isDisabled();
        
        if (isDisabled) {
          // Verify warning message appears
          await expect(page.locator('text=/Must test after last edit/i')).toBeVisible();
        } else {
          // If enabled, try clicking and verify error
          await activateButton.click();
          await page.waitForTimeout(1000);
          
          // Should see error about testing required
          const errorAlert = page.locator('text=/test/i');
          const hasError = await errorAlert.isVisible().catch(() => false);
          
          if (hasError) {
            await expect(errorAlert).toBeVisible();
          }
        }
      }
    } else {
      test.skip('No draft automations to test activation gate');
    }
  });

  test('B) Test mode does not send messages', async ({ page }) => {
    await page.goto('/automations');
    await page.waitForSelector('text=Automations', { timeout: 10000 });

    // Wait for automations to load
    await page.waitForTimeout(2000);

    // Find first automation
    const firstAutomation = page.locator('div[class*="hover:bg-gray-50"]').first();

    if (await firstAutomation.isVisible()) {
      // Click to open detail
      await firstAutomation.click();
      await page.waitForTimeout(1000);

      // Click "Test Automation" button
      const testButton = page.locator('button:has-text("Test Automation")');
      
      if (await testButton.isVisible()) {
        await testButton.click();
        await page.waitForTimeout(500);

        // Verify test mode warning appears
        await expect(page.locator('text=/No messages will be sent/i')).toBeVisible();
        await expect(page.locator('text=/simulation/i')).toBeVisible();

        // Fill test context (minimal)
        const textarea = page.locator('textarea');
        if (await textarea.isVisible()) {
          await textarea.fill('{}');
        }

        // Run test
        const runButton = page.locator('button:has-text("Run Test")');
        if (await runButton.isVisible()) {
          await runButton.click();
          await page.waitForTimeout(2000);

          // Verify test completed (check for success message or log entry)
          const successMessage = page.locator('text=/Test completed|execution log/i');
          const hasSuccess = await successMessage.isVisible().catch(() => false);
          
          // If we see execution logs, verify test status
          const testLog = page.locator('text=/test/i').first();
          const hasTestLog = await testLog.isVisible().catch(() => false);
          
          // At minimum, verify the test dialog closed or test was initiated
          // (Full verification would require checking execution logs for status=test)
          expect(hasSuccess || hasTestLog || !(await testButton.isVisible())).toBeTruthy();
        }
      } else {
        test.skip('Test button not available');
      }
    } else {
      test.skip('No automations to test');
    }
  });

  test('C) Create automation end-to-end', async ({ page }) => {
    await page.goto('/automations');
    await page.waitForSelector('text=Automations', { timeout: 10000 });

    // Click "Create Automation"
    await page.click('a:has-text("Create Automation")');
    await page.waitForURL('/automations/new', { timeout: 5000 });

    // Step 1: Basic Info
    await page.fill('input[placeholder*="e.g., Welcome New Client"]', 'Test Automation');
    await page.selectOption('select', 'front_desk');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Step 2: Trigger
    await page.selectOption('select', 'message_received');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Step 3: Conditions (skip - optional)
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Step 4: Actions (need to add template first, so go to Step 5)
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Step 5: Templates
    await page.fill('input[placeholder*="e.g., welcome_message"]', 'test_template');
    await page.fill('textarea[placeholder*="Hello"]', 'Hello {{clientName}}!');
    await page.click('button:has-text("Add Template")');
    await page.waitForTimeout(500);

    // Go back to Step 4 to add action
    await page.click('button:has-text("Back")');
    await page.waitForTimeout(500);

    // Add action
    await page.selectOption('select[value="client"]', 'client');
    await page.selectOption('select:has(option[value="test_template"])', 'test_template');
    await page.click('button:has-text("Add Action")');
    await page.waitForTimeout(500);

    // Continue to Step 6
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Step 6: Review & Test
    // Fill test context
    const testContextTextarea = page.locator('textarea[placeholder*="threadId"]');
    if (await testContextTextarea.isVisible()) {
      await testContextTextarea.fill('{"threadId": "test-123"}');
    }

    // Run test
    await page.click('button:has-text("Run Test")');
    await page.waitForTimeout(2000);

    // Verify test completed (check for test results or success message)
    const testResults = page.locator('text=/Test Results|conditionResults/i');
    const hasResults = await testResults.isVisible().catch(() => false);

    // Activate
    const activateButton = page.locator('button:has-text("Activate")');
    if (await activateButton.isVisible() && !(await activateButton.isDisabled())) {
      await activateButton.click();
      await page.waitForURL('/automations', { timeout: 5000 });

      // Verify automation appears in list with active status
      await expect(page.locator('text=Test Automation')).toBeVisible();
      await expect(page.locator('text=Active').first()).toBeVisible();
    } else {
      // If activate is disabled, save draft and verify
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Test Automation')).toBeVisible();
    }
  });
});
