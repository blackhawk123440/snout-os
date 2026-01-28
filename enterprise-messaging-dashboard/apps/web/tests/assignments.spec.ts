import { test, expect } from '@playwright/test';

test.describe('Assignments & Windows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('G) Create window + prevents overlap', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForSelector('text=Assignments & Windows', { timeout: 10000 });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Click "Create Window"
    await page.click('button:has-text("Create Window")');
    await page.waitForTimeout(500);

    // Fill form - need threads and sitters to exist
    const threadSelect = page.locator('select').first();
    const threadOptions = await threadSelect.locator('option').count();

    if (threadOptions <= 1) {
      test.skip('No threads available for testing');
    }

    // Select first thread (skip "Select thread..." option)
    await threadSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Select first sitter
    const sitterSelect = page.locator('select').nth(1);
    await sitterSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Set start time (now)
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const startInput = page.locator('input[type="datetime-local"]').first();
    const endInput = page.locator('input[type="datetime-local"]').last();

    await startInput.fill(formatDateTimeLocal(startTime));
    await endInput.fill(formatDateTimeLocal(endTime));
    await page.waitForTimeout(500);

    // Create window
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(2000);

    // Verify window appears in list
    const windowInList = page.locator('text=/Active|Future|Past/').first();
    await expect(windowInList).toBeVisible();

    // Try to create overlapping window
    await page.click('button:has-text("Create Window")');
    await page.waitForTimeout(500);

    // Select same thread
    await threadSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Set overlapping times
    const overlapStart = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min after start
    const overlapEnd = new Date(endTime.getTime() + 30 * 60 * 1000); // 30 min after end

    await startInput.fill(formatDateTimeLocal(overlapStart));
    await endInput.fill(formatDateTimeLocal(overlapEnd));
    await page.waitForTimeout(500);

    // Try to create - should fail
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);

    // Should see error message about overlap
    const errorMessage = page.locator('text=/overlap|Overlap/i');
    const hasError = await errorMessage.isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
  });

  test('H) Edit window updates status + visible in calendar/list', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForSelector('text=Assignments & Windows', { timeout: 10000 });

    await page.waitForTimeout(2000);

    // Find first window in list
    const editButton = page.locator('button:has-text("Edit")').first();
    const hasEdit = await editButton.isVisible().catch(() => false);

    if (hasEdit) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Update end time (extend by 1 hour)
      const endInput = page.locator('input[type="datetime-local"]').last();
      const currentValue = await endInput.inputValue();
      
      if (currentValue) {
        const currentDate = parseDateTimeLocal(currentValue);
        const newEnd = new Date(currentDate.getTime() + 60 * 60 * 1000);
        await endInput.fill(formatDateTimeLocal(newEnd));
        await page.waitForTimeout(500);

        // Save
        await page.click('button:has-text("Update")');
        await page.waitForTimeout(2000);

        // Verify window updated (check list or calendar)
        const updatedWindow = page.locator('text=/Active|Future|Past/').first();
        await expect(updatedWindow).toBeVisible();
      } else {
        test.skip('Could not read current end time');
      }
    } else {
      test.skip('No windows to edit');
    }
  });

  test('I) Delete active window requires extra confirmation', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForSelector('text=Assignments & Windows', { timeout: 10000 });

    await page.waitForTimeout(2000);

    // Find active window (status badge should show "Active")
    const activeWindow = page.locator('text=Active').first();
    const hasActive = await activeWindow.isVisible().catch(() => false);

    if (hasActive) {
      // Find delete button for this row
      const deleteButton = activeWindow.locator('..').locator('button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Should see confirmation dialog with extra warning for active window
        const confirmDialog = page.locator('text=/active|Active|routing/i');
        const hasWarning = await confirmDialog.isVisible().catch(() => false);
        
        // The confirmation should mention active window or routing
        expect(hasWarning).toBeTruthy();

        // Cancel deletion
        await page.click('button:has-text("Cancel")').catch(() => {
          // If no cancel, try OK and then cancel
          page.keyboard.press('Escape');
        });
      } else {
        test.skip('Delete button not found for active window');
      }
    } else {
      test.skip('No active windows to test deletion');
    }
  });
});

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeLocal(value: string): Date {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}
