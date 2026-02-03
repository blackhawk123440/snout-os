/**
 * Rotation Settings Persistence Test
 * 
 * Verifies that rotation settings persist end-to-end:
 * - Save settings via UI
 * - Refresh page
 * - Assert values persisted
 * - Assert API returns saved values
 */

import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers/login';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Rotation Settings Persistence', () => {
  test('Settings persist after save and refresh', async ({ page }) => {
    await loginAsOwner(page);
    
    // Navigate to rotation settings
    await page.goto(`${BASE_URL}/settings/rotation`);
    await page.waitForLoadState('networkidle');

    // Change settings
    await page.selectOption('select', 'HASH_SHUFFLE'); // Change strategy
    await page.fill('input[type="number"]:nth-of-type(1)', '10'); // stickyReuseDays
    await page.fill('input[type="number"]:nth-of-type(2)', '96'); // postBookingGraceHours
    await page.fill('input[type="number"]:nth-of-type(3)', '14'); // inactivityReleaseDays
    await page.fill('input[type="number"]:nth-of-type(4)', '60'); // maxPoolThreadLifetimeDays
    await page.fill('input[type="number"]:nth-of-type(5)', '5'); // minPoolReserve
    await page.fill('input[type="number"]:nth-of-type(6)', '2'); // maxConcurrentThreadsPerPoolNumber
    await page.selectOption('select:last-of-type', 'threadId'); // stickyReuseKey

    // Save settings
    await page.click('button:has-text("Save Settings")');
    await page.waitForSelector('text=Settings saved successfully', { timeout: 5000 });

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Assert values persisted
    await expect(page.locator('select').first()).toHaveValue('HASH_SHUFFLE');
    await expect(page.locator('input[type="number"]:nth-of-type(1)')).toHaveValue('10');
    await expect(page.locator('input[type="number"]:nth-of-type(2)')).toHaveValue('96');
    await expect(page.locator('input[type="number"]:nth-of-type(3)')).toHaveValue('14');
    await expect(page.locator('input[type="number"]:nth-of-type(4)')).toHaveValue('60');
    await expect(page.locator('input[type="number"]:nth-of-type(5)')).toHaveValue('5');
    await expect(page.locator('input[type="number"]:nth-of-type(6)')).toHaveValue('2');
    await expect(page.locator('select:last-of-type')).toHaveValue('threadId');

    // Check API returns saved values
    const response = await page.request.get(`${BASE_URL}/api/settings/rotation`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.poolSelectionStrategy).toBe('HASH_SHUFFLE');
    expect(data.stickyReuseDays).toBe(10);
    expect(data.postBookingGraceHours).toBe(96);
    expect(data.inactivityReleaseDays).toBe(14);
    expect(data.maxPoolThreadLifetimeDays).toBe(60);
    expect(data.minPoolReserve).toBe(5);
    expect(data.maxConcurrentThreadsPerPoolNumber).toBe(2);
    expect(data.stickyReuseKey).toBe('threadId');
  });
});
