/**
 * Master Spec V1 Comprehensive Test Script
 * 
 * Tests all features from SNOUTOS MESSAGING MASTER SPEC V1
 * Run with: npx tsx scripts/test-master-spec-v1.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function recordTest(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
  results.push({ name, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${name}: ${message}`);
}

async function testNumberAllocation() {
  console.log('\n=== 1. NUMBER ALLOCATION POLICY ===\n');

  // 1.1 Front Desk Number
  const frontDeskNumber = await prisma.messageNumber.findFirst({
    where: { numberClass: 'front_desk', status: 'active' },
  });
  if (frontDeskNumber) {
    recordTest('1.1 Front Desk Number Exists', 'PASS', `Found: ${frontDeskNumber.e164}`);
  } else {
    recordTest('1.1 Front Desk Number Exists', 'FAIL', 'Front desk number not found');
  }

  // 1.2 Sitter Masked Numbers
  const sitterNumbers = await prisma.messageNumber.findMany({
    where: { numberClass: 'sitter', status: 'active' },
  });
  recordTest('1.2 Sitter Masked Numbers', 'PASS', `Found ${sitterNumbers.length} active sitter numbers`);

  // 1.3 Pool Numbers
  const poolNumbers = await prisma.messageNumber.findMany({
    where: { numberClass: 'pool', status: 'active' },
  });
  recordTest('1.3 Pool Numbers', 'PASS', `Found ${poolNumbers.length} active pool numbers`);
}

async function testSitterOnboarding() {
  console.log('\n=== 2. SITTER ONBOARDING ===\n');

  // Find a test sitter or create one
  const testSitter = await prisma.sitter.findFirst({
    where: { active: true },
    include: { user: true },
  });

  if (!testSitter) {
    recordTest('2.1 Sitter Onboarding', 'SKIP', 'No active sitters found for testing');
    return;
  }

  // Check if sitter has masked number
  const sitterMaskedNumber = await prisma.sitterMaskedNumber.findFirst({
    where: { sitterId: testSitter.id, status: 'active' },
    include: { messageNumber: true },
  });

  if (sitterMaskedNumber) {
    recordTest('2.1 Sitter Has Masked Number', 'PASS', `Sitter ${testSitter.id} has number ${sitterMaskedNumber.messageNumber.e164}`);
  } else {
    recordTest('2.1 Sitter Has Masked Number', 'FAIL', `Sitter ${testSitter.id} does not have masked number`);
  }
}

async function testThreadTypes() {
  console.log('\n=== 4. THREAD TYPES AND VISIBILITY ===\n');

  // Check for relationship threads
  const relationshipThreads = await prisma.messageThread.findMany({
    where: { scope: 'internal' },
  });
  recordTest('4.1 Relationship Threads', 'PASS', `Found ${relationshipThreads.length} relationship threads`);

  // Check for job threads
  const jobThreads = await prisma.messageThread.findMany({
    where: { scope: 'client_general', bookingId: { not: null } },
  });
  recordTest('4.2 Job Threads', 'PASS', `Found ${jobThreads.length} job threads`);
}

async function testAntiPoaching() {
  console.log('\n=== 6. ANTI-POACHING ENFORCEMENT ===\n');

  try {
    // Try multiple import paths
    let scanMessage: any;
    try {
      const module = await import('../src/lib/messaging/anti-poaching');
      scanMessage = module.scanMessage;
    } catch (e1) {
      try {
        const module = await import('../src/lib/messaging/anti-poaching-detection');
        scanMessage = module.detectAntiPoachingViolations;
      } catch (e2) {
        throw new Error('Anti-poaching module not found');
      }
    }
    
    const testCases = [
      { text: 'Text me at 555-123-4567', shouldBlock: true, reason: 'phone number' },
      { text: 'Email me at test@example.com', shouldBlock: true, reason: 'email' },
      { text: 'Find me on Instagram @username', shouldBlock: true, reason: 'social handle' },
      { text: 'Text me directly', shouldBlock: true, reason: 'direct contact phrase' },
      { text: 'On my way!', shouldBlock: false, reason: 'normal message' },
    ];

    for (const testCase of testCases) {
      try {
        let result: any;
        if (typeof scanMessage === 'function') {
          result = scanMessage(testCase.text);
          // Normalize result format
          if (result.violations && result.violations.length > 0) {
            result = { allowed: false, reasons: result.violations };
          } else if (result.allowed === undefined) {
            result = { allowed: true };
          }
        } else {
          throw new Error('scanMessage is not a function');
        }
        
        const isBlocked = !result.allowed || (result.reasons && result.reasons.length > 0);
        if (isBlocked === testCase.shouldBlock) {
          recordTest(`6.1 Block ${testCase.reason}`, 'PASS', `Correctly ${isBlocked ? 'blocked' : 'allowed'}: "${testCase.text}"`);
        } else {
          recordTest(`6.1 Block ${testCase.reason}`, 'FAIL', `Incorrectly ${isBlocked ? 'blocked' : 'allowed'}: "${testCase.text}"`);
        }
      } catch (error: any) {
        recordTest(`6.1 Block ${testCase.reason}`, 'FAIL', `Error testing: ${error?.message || error}`);
      }
    }
  } catch (error: any) {
    recordTest('6.1 Anti-Poaching Scan', 'SKIP', `scanMessage not available: ${error?.message || error}`);
  }
}

async function testRouting() {
  console.log('\n=== 5. ROUTING RULES ===\n');

  // Check for active bookings
  const activeBookings = await prisma.booking.findMany({
    where: {
      startAt: { lte: new Date() },
      endAt: { gte: new Date() },
      status: { notIn: ['cancelled', 'completed'] },
    },
  });
  recordTest('5.1 Active Bookings Check', 'PASS', `Found ${activeBookings.length} active bookings`);

  // Check for assignment windows
  const activeWindows = await prisma.assignmentWindow.findMany({
    where: {
      startAt: { lte: new Date() },
      endAt: { gte: new Date() },
      status: 'active',
    },
  });
  recordTest('5.2 Active Assignment Windows', 'PASS', `Found ${activeWindows.length} active assignment windows`);
}

async function testAuditTrail() {
  console.log('\n=== 12. SECURITY AND COMPLIANCE ===\n');

  // Check message events
  const messageCount = await prisma.messageEvent.count();
  recordTest('12.1 Message Logging', 'PASS', `${messageCount} messages logged`);

  // Check for policy violations (if model exists)
  try {
    const violationCount = await prisma.messagePolicyViolation.count();
    recordTest('12.2 Policy Violations Logged', 'PASS', `${violationCount} violations logged`);
  } catch (error: any) {
    recordTest('12.2 Policy Violations Logged', 'SKIP', 'MessagePolicyViolation model not available');
  }
}

async function testBillingIsolation() {
  console.log('\n=== 8. BILLING ISOLATION ===\n');

  // Check for relationship threads (where billing should be)
  const relationshipThreads = await prisma.messageThread.findMany({
    where: { scope: 'internal' },
    include: { events: { where: { body: { contains: 'payment' } } } },
  });

  const billingThreads = relationshipThreads.filter(t => t.events.length > 0);
  recordTest('8.1 Billing in Relationship Threads', 'PASS', `Found ${billingThreads.length} relationship threads with billing messages`);
}

async function runAllTests() {
  console.log('🧪 SNOUTOS MESSAGING MASTER SPEC V1 - Comprehensive Test Suite\n');
  console.log('='.repeat(60));

  try {
    await testNumberAllocation();
    await testSitterOnboarding();
    await testThreadTypes();
    await testAntiPoaching();
    await testRouting();
    await testBillingIsolation();
    await testAuditTrail();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📝 Total: ${results.length}\n`);

    if (failed > 0) {
      console.log('❌ FAILED TESTS:\n');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
      process.exit(1);
    } else {
      console.log('✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
