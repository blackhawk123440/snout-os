/**
 * Playwright Global Setup
 * 
 * Generates storageState files for owner and sitter authentication.
 * These files contain the NextAuth session cookies needed for E2E tests.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const E2E_AUTH_KEY = process.env.E2E_AUTH_KEY || 'test-e2e-key-change-in-production';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';
const SITTER_EMAIL = process.env.SITTER_EMAIL || 'sitter@example.com';

async function globalSetup(config: FullConfig) {
  // Create .auth directory if it doesn't exist
  const authDir = path.join(config.rootDir || process.cwd(), 'tests', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Wait for server to be ready (retry up to 30 times, 2 seconds apart)
  console.log('[Global Setup] Waiting for server to be ready...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const healthCheck = await fetch(`${BASE_URL}/api/auth/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (healthCheck.ok || healthCheck.status === 404) {
        // Any response means server is running
        serverReady = true;
        console.log('[Global Setup] Server is ready');
        break;
      }
    } catch {
      // Server not ready yet
    }
    if (i < 29) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!serverReady) {
    throw new Error(`Server at ${BASE_URL} is not ready after 60 seconds. Make sure the dev server is running.`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Authenticate as owner using browser context request (so cookies go to browser context)
    console.log('[Global Setup] Authenticating as owner...');
    const ownerResponse = await context.request.post(`${BASE_URL}/api/ops/e2e-login`, {
      data: {
        role: 'owner',
        email: OWNER_EMAIL,
      },
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-key': E2E_AUTH_KEY,
      },
    });

    if (!ownerResponse.ok()) {
      const errorText = await ownerResponse.text();
      throw new Error(`Owner authentication failed: ${ownerResponse.status()} - ${errorText}`);
    }

    // Extract cookies from Set-Cookie header and add to browser context
    const setCookieHeader = ownerResponse.headers()['set-cookie'];
    if (setCookieHeader) {
      const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      const cookies = cookieStrings.map(cookieStr => {
        const [nameValue, ...rest] = cookieStr.split(';');
        const [name, value] = nameValue.split('=');
        const cookie: any = {
          name: name.trim(),
          value: value.trim(),
          domain: new URL(BASE_URL).hostname,
          path: '/',
        };
        // Parse additional attributes
        for (const attr of rest) {
          const trimmed = attr.trim();
          const lower = trimmed.toLowerCase();
          if (lower.startsWith('max-age=')) {
            const maxAge = parseInt(trimmed.split('=')[1]);
            cookie.expires = Date.now() + (maxAge * 1000);
          } else if (lower === 'httponly') {
            cookie.httpOnly = true;
          } else if (lower === 'secure') {
            cookie.secure = true;
          } else if (lower.startsWith('samesite=')) {
            cookie.sameSite = trimmed.split('=')[1] || 'Lax';
          }
        }
        return cookie;
      });
      await context.addCookies(cookies);
    }
    
    // Save owner storage state
    await context.storageState({ path: path.join(authDir, 'owner.json') });
    console.log('[Global Setup] Owner storage state saved');

    // Create new context for sitter
    await context.close();
    const sitterContext = await browser.newContext();
    const sitterPage = await sitterContext.newPage();

    // Authenticate as sitter using browser context request (so cookies go to browser context)
    console.log('[Global Setup] Authenticating as sitter...');
    const sitterResponse = await sitterContext.request.post(`${BASE_URL}/api/ops/e2e-login`, {
      data: {
        role: 'sitter',
        email: SITTER_EMAIL,
      },
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-key': E2E_AUTH_KEY,
      },
    });

    if (!sitterResponse.ok()) {
      const errorText = await sitterResponse.text();
      throw new Error(`Sitter authentication failed: ${sitterResponse.status()} - ${errorText}`);
    }

    // Extract cookies from Set-Cookie header and add to browser context
    const sitterSetCookieHeader = sitterResponse.headers()['set-cookie'];
    if (sitterSetCookieHeader) {
      const cookieStrings = Array.isArray(sitterSetCookieHeader) ? sitterSetCookieHeader : [sitterSetCookieHeader];
      const cookies = cookieStrings.map(cookieStr => {
        const [nameValue, ...rest] = cookieStr.split(';');
        const [name, value] = nameValue.split('=');
        const cookie: any = {
          name: name.trim(),
          value: value.trim(),
          domain: new URL(BASE_URL).hostname,
          path: '/',
        };
        // Parse additional attributes
        for (const attr of rest) {
          const trimmed = attr.trim();
          const lower = trimmed.toLowerCase();
          if (lower.startsWith('max-age=')) {
            const maxAge = parseInt(trimmed.split('=')[1]);
            cookie.expires = Date.now() + (maxAge * 1000);
          } else if (lower === 'httponly') {
            cookie.httpOnly = true;
          } else if (lower === 'secure') {
            cookie.secure = true;
          } else if (lower.startsWith('samesite=')) {
            cookie.sameSite = trimmed.split('=')[1] || 'Lax';
          }
        }
        return cookie;
      });
      await sitterContext.addCookies(cookies);
    }
    
    // Save sitter storage state
    await sitterContext.storageState({ path: path.join(authDir, 'sitter.json') });
    console.log('[Global Setup] Sitter storage state saved');

    await sitterContext.close();
  } catch (error) {
    console.error('[Global Setup] Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
