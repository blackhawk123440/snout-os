#!/usr/bin/env tsx
/**
 * Deployment Proof Pack Generator
 * 
 * Generates proof that the canonical architecture is deployed correctly.
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';

const WEB_PUBLIC_URL = process.env.WEB_PUBLIC_URL || 'https://snout-os-staging.onrender.com';
let API_PUBLIC_URL = process.env.API_PUBLIC_URL || '';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'password123';

const PROOF_PACK_DIR = join(process.cwd(), 'proof-pack');
const SCREENSHOTS_DIR = join(PROOF_PACK_DIR, 'screenshots');

// Try to infer API_PUBLIC_URL from WEB_PUBLIC_URL if not set
if (!API_PUBLIC_URL) {
  if (WEB_PUBLIC_URL.includes('snout-os-staging')) {
    API_PUBLIC_URL = WEB_PUBLIC_URL.replace('snout-os-staging', 'snout-os-api');
    console.log(`⚠️  API_PUBLIC_URL not set, inferring: ${API_PUBLIC_URL}`);
  } else if (WEB_PUBLIC_URL.includes('snout-os-web')) {
    API_PUBLIC_URL = WEB_PUBLIC_URL.replace('snout-os-web', 'snout-os-api');
    console.log(`⚠️  API_PUBLIC_URL not set, inferring: ${API_PUBLIC_URL}`);
  } else {
    console.error('❌ API_PUBLIC_URL is required');
    console.error('Usage: API_PUBLIC_URL=https://snout-os-api.onrender.com WEB_PUBLIC_URL=https://snout-os-staging.onrender.com pnpm proof:deployment');
    console.error('\nOr set API_PUBLIC_URL environment variable.');
    process.exit(1);
  }
}

async function curlCommand(url: string, method: string = 'GET', headers: Record<string, string> = {}): Promise<string> {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const methodArg = method !== 'GET' ? `-X ${method}` : '';
  return `curl -i ${methodArg} ${headerArgs} "${url}"`;
}

async function fetchWithCurl(url: string, method: string = 'GET', headers: Record<string, string> = {}): Promise<{ status: number; headers: Headers; body: string }> {
  try {
    const response = await fetch(url, { method, headers });
    const body = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      body,
    };
  } catch (error: any) {
    return {
      status: 0,
      headers: new Headers(),
      body: error.message,
    };
  }
}

async function loginAsOwner(page: Page): Promise<boolean> {
  try {
    await page.goto(`${WEB_PUBLIC_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const emailInput = document.querySelector('#email');
      const passwordInput = document.querySelector('#password');
      const submitButton = document.querySelector('button[type="submit"]');
      return emailInput && passwordInput && submitButton;
    }, { timeout: 30000 });

    await page.fill('#email', OWNER_EMAIL);
    await page.fill('#password', OWNER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${WEB_PUBLIC_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

    const sessionResponse = await page.request.get(`${WEB_PUBLIC_URL}/api/auth/session`);
    const sessionData = await sessionResponse.json();
    return sessionResponse.ok() && sessionData?.user?.email === OWNER_EMAIL;
  } catch (error: any) {
    console.error(`Login failed: ${error.message}`);
    return false;
  }
}

async function getAPIToken(page: Page): Promise<string | null> {
  try {
    // Get session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session-token'));
    if (!sessionCookie) return null;

    // Call Next.js proxy to get JWT token (it will generate one)
    // Or extract from network requests
    const response = await page.request.get(`${WEB_PUBLIC_URL}/api/messages/threads`);
    if (response.ok()) {
      // Token is generated server-side, we need to capture it from a request
      // For now, return a placeholder - the actual token generation happens in proxy-auth.ts
      return 'TOKEN_GENERATED_BY_PROXY';
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🔍 Generating Deployment Proof Pack\n');
  console.log(`Web: ${WEB_PUBLIC_URL}`);
  console.log(`API: ${API_PUBLIC_URL}\n`);

  // Clean and create directories
  if (existsSync(PROOF_PACK_DIR)) {
    rmSync(PROOF_PACK_DIR, { recursive: true, force: true });
  }
  mkdirSync(PROOF_PACK_DIR, { recursive: true });
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // PROOF 1: API Health Check
  console.log('📸 PROOF 1: API Health Check...');
  const healthResponse = await fetchWithCurl(`${API_PUBLIC_URL}/health`);
  const healthCurl = await curlCommand(`${API_PUBLIC_URL}/health`);
  const healthOutput = `${healthCurl}\n\nStatus: ${healthResponse.status}\n\n${healthResponse.body}`;
  writeFileSync(join(PROOF_PACK_DIR, 'curl-health.txt'), healthOutput);
  
  if (healthResponse.status === 200) {
    console.log('✅ API health: 200');
  } else {
    console.log(`❌ API health: ${healthResponse.status}`);
  }

  // PROOF 2: Web Shadow Route Check
  console.log('📸 PROOF 2: Web Shadow Route Check...');
  const shadowResponse = await fetchWithCurl(`${WEB_PUBLIC_URL}/api/messages/threads`, 'HEAD');
  const shadowCurl = await curlCommand(`${WEB_PUBLIC_URL}/api/messages/threads`, 'HEAD');
  const shadowOutput = `${shadowCurl}\n\nStatus: ${shadowResponse.status}\n\n${shadowResponse.body.substring(0, 500)}`;
  writeFileSync(join(PROOF_PACK_DIR, 'curl-web-shadow.txt'), shadowOutput);
  
  const shadowValid = shadowResponse.status === 404 || shadowResponse.status === 503 || shadowResponse.status === 401 || shadowResponse.status === 403;
  if (shadowValid) {
    console.log(`✅ Web shadow route: ${shadowResponse.status} (acceptable)`);
  } else {
    console.log(`❌ Web shadow route: ${shadowResponse.status} (should be 404/503/401/403)`);
  }

  // PROOF 3: Browser Network Tab (HAR)
  console.log('📸 PROOF 3: Browser Network Tab (HAR)...');
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  let networkHar: any = null;

  try {
    browser = await chromium.launch();
    context = await browser.newContext({
      baseURL: WEB_PUBLIC_URL,
      recordHar: { path: join(PROOF_PACK_DIR, 'network.har'), mode: 'minimal' },
    });
    page = await context.newPage();

    const loggedIn = await loginAsOwner(page);
    if (loggedIn) {
      await page.goto(`${WEB_PUBLIC_URL}/messages`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Save HAR
      await context.close();
      if (existsSync(join(PROOF_PACK_DIR, 'network.har'))) {
        const harContent = readFileSync(join(PROOF_PACK_DIR, 'network.har'), 'utf-8');
        networkHar = JSON.parse(harContent);
        
        // Check for API_PUBLIC_URL requests
        const apiRequests = networkHar.log?.entries?.filter((entry: any) => 
          entry.request?.url?.includes(API_PUBLIC_URL.replace('https://', '').replace('http://', ''))
        ) || [];

        if (apiRequests.length > 0) {
          console.log(`✅ Network HAR: ${apiRequests.length} API requests found`);
        } else {
          console.log('❌ Network HAR: No API requests found');
        }
      }
    } else {
      console.log('❌ Network HAR: Login failed');
    }
  } catch (error: any) {
    console.error(`Network HAR error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // PROOF 4: /ops/proof Page
  console.log('📸 PROOF 4: /ops/proof Page...');
  try {
    browser = await chromium.launch();
    context = await browser.newContext({ baseURL: WEB_PUBLIC_URL });
    page = await context.newPage();

    const loggedIn = await loginAsOwner(page);
    if (loggedIn) {
      await page.goto(`${WEB_PUBLIC_URL}/ops/proof`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const runButton = page.locator('button:has-text("Run"), button:has-text("Test")').first();
      if (await runButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await runButton.click();
        await page.waitForTimeout(5000);
      }

      await page.screenshot({ path: join(SCREENSHOTS_DIR, 'ops-proof.png'), fullPage: true });
      console.log('✅ /ops/proof screenshot captured');
    } else {
      console.log('❌ /ops/proof: Login failed');
    }
  } catch (error: any) {
    console.error(`/ops/proof error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // PROOF 5: Worker Evidence
  console.log('📸 PROOF 5: Worker Evidence...');
  try {
    // Try to trigger a retry job or check audit events
    browser = await chromium.launch();
    context = await browser.newContext({ baseURL: WEB_PUBLIC_URL });
    page = await context.newPage();

    const loggedIn = await loginAsOwner(page);
    if (loggedIn) {
      // Check audit endpoint for worker events
      const auditResponse = await page.request.get(`${WEB_PUBLIC_URL}/api/audit?limit=50`);
      const auditData = await auditResponse.json().catch(() => ({}));
      
      // Look for worker-related events
      const workerEvents = (auditData.events || []).filter((e: any) => 
        e.eventType?.includes('retry') || 
        e.eventType?.includes('automation') || 
        e.eventType?.includes('pool') ||
        e.eventType?.includes('worker')
      );

      const workerProof = `Worker Evidence Check\n\n` +
        `Audit Events Found: ${auditData.events?.length || 0}\n` +
        `Worker-Related Events: ${workerEvents.length}\n\n` +
        `Worker Events:\n${JSON.stringify(workerEvents.slice(0, 5), null, 2)}\n\n` +
        `Note: If no worker events found, check Render worker logs for "🚀 Workers started" and job execution.`;

      writeFileSync(join(PROOF_PACK_DIR, 'worker-proof.txt'), workerProof);
      
      if (workerEvents.length > 0) {
        console.log(`✅ Worker evidence: ${workerEvents.length} events found`);
      } else {
        console.log('⚠️ Worker evidence: No events found (check logs manually)');
      }
    } else {
      writeFileSync(join(PROOF_PACK_DIR, 'worker-proof.txt'), 'Worker Evidence: Login failed - cannot check audit events');
      console.log('❌ Worker evidence: Login failed');
    }
  } catch (error: any) {
    writeFileSync(join(PROOF_PACK_DIR, 'worker-proof.txt'), `Worker Evidence Error: ${error.message}`);
    console.error(`Worker evidence error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // Generate summary
  const summary = `Deployment Proof Pack Summary\n\n` +
    `Generated: ${new Date().toISOString()}\n` +
    `WEB_PUBLIC_URL: ${WEB_PUBLIC_URL}\n` +
    `API_PUBLIC_URL: ${API_PUBLIC_URL}\n\n` +
    `Files Generated:\n` +
    `- curl-health.txt\n` +
    `- curl-web-shadow.txt\n` +
    `- network.har\n` +
    `- screenshots/ops-proof.png\n` +
    `- worker-proof.txt\n`;

  writeFileSync(join(PROOF_PACK_DIR, 'SUMMARY.txt'), summary);
  console.log(`\n✅ Proof pack generated: ${PROOF_PACK_DIR}`);
}

main().catch(console.error);
