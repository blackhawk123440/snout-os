#!/usr/bin/env tsx
/**
 * Quick verification script for E2E auth
 * Run this to test if E2E login route works before running full tests
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const E2E_AUTH_KEY = process.env.E2E_AUTH_KEY || 'test-e2e-key-change-in-production';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';

async function verify() {
  console.log('🔍 Verifying E2E auth endpoint...');
  console.log(`   BASE_URL: ${BASE_URL}`);
  console.log(`   E2E_AUTH_KEY: ${E2E_AUTH_KEY.substring(0, 10)}...`);
  
  try {
    // Test owner login
    const response = await fetch(`${BASE_URL}/api/ops/e2e-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-key': E2E_AUTH_KEY,
      },
      body: JSON.stringify({
        role: 'owner',
        email: OWNER_EMAIL,
      }),
    });

    console.log(`   Status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`   ❌ Failed: ${text}`);
      process.exit(1);
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      console.log(`   ✅ Success! Cookie header present`);
      console.log(`   Cookie: ${setCookie.substring(0, 50)}...`);
    } else {
      console.error(`   ❌ No Set-Cookie header in response`);
      process.exit(1);
    }

    // Test session endpoint
    const cookies = setCookie.split(';')[0];
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': cookies,
      },
    });

    if (sessionResponse.ok) {
      const session = await sessionResponse.json();
      if (session?.user) {
        console.log(`   ✅ Session verified: ${session.user.email}`);
      } else {
        console.error(`   ❌ Session missing user object`);
        process.exit(1);
      }
    } else {
      console.error(`   ❌ Session check failed: ${sessionResponse.status}`);
      process.exit(1);
    }

    console.log('\n✅ E2E auth is working correctly!');
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.error(`\n   ⚠️  Server is not running at ${BASE_URL}`);
      console.error(`   Start it in another terminal with:`);
      console.error(`   ENABLE_E2E_AUTH=true E2E_AUTH_KEY='test-e2e-key-change-in-production' NEXTAUTH_SECRET='test-secret-for-smoke-tests-minimum-64-characters-required-for-nextauth-jwt-encoding' pnpm dev`);
      console.error(`\n   Then run this verification script again.`);
    }
    process.exit(1);
  }
}

verify();
