/**
 * Sitter Messages Protection E2E Test
 * 
 * Verifies that sitters are blocked from accessing /messages
 * and redirected to /sitter/inbox
 */

import { test, expect } from '@playwright/test';

test.describe('Sitter Messages Protection', () => {
  test('Sitter attempting to access /messages is redirected to /sitter/inbox', async ({ page }) => {
    // TODO: Implement sitter login helper
    // For now, this test structure is in place
    // await loginAsSitter(page);
    
    // Navigate directly to /messages
    await page.goto('/messages');
    
    // Should be redirected to /sitter/inbox
    await expect(page).toHaveURL(/\/sitter\/inbox/);
  });

  test('Sitter attempting to call owner messaging API receives 403', async ({ request }) => {
    // TODO: Implement sitter auth token helper
    // const sitterToken = await getSitterAuthToken();
    
    // Attempt to call owner messaging endpoint
    const response = await request.get('/api/messages/threads', {
      // headers: { Authorization: `Bearer ${sitterToken}` },
    });
    
    // Should receive 403 Forbidden
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Sitters must use');
  });
});
