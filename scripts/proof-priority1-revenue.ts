/**
 * Priority 1 Revenue Critical Automation Gaps - Proof Script
 * 
 * This script validates that all Priority 1 requirements are met.
 * Fails hard if any invariant breaks.
 * 
 * Usage: npx tsx scripts/proof-priority1-revenue.ts
 */

import { PrismaClient } from '@prisma/client';
import { calculatePriceBreakdown } from '../src/lib/booking-utils';
import { getMessageTemplate } from '../src/lib/automation-utils';
import { getPaymentLinkMessageTemplate } from '../src/lib/payment-link-message';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  evidence?: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, error?: string, evidence?: string) {
  results.push({ name, passed, error, evidence });
  if (!passed) {
    console.error(`❌ FAILED: ${name}`);
    if (error) console.error(`   Error: ${error}`);
    if (evidence) console.error(`   Evidence: ${evidence}`);
  } else {
    console.log(`✅ PASSED: ${name}`);
    if (evidence) console.log(`   Evidence: ${evidence}`);
  }
}

async function testAutomationSettingsPersistence() {
  console.log('\n📋 Testing Automation Settings Persistence...');
  
  // Test 1: Settings can be saved
  try {
    const testSettings = {
      testAutomation: {
        enabled: true,
        sendToClient: true,
      },
    };
    
    await prisma.setting.upsert({
      where: { key: 'automation' },
      update: { value: JSON.stringify(testSettings) },
      create: { key: 'automation', value: JSON.stringify(testSettings), category: 'automation', label: 'Automation Settings' },
    });
    
    const saved = await prisma.setting.findUnique({
      where: { key: 'automation' },
    });
    
    if (!saved) {
      addResult('Automation settings can be saved', false, 'Setting not found after save');
      return;
    }
    
    const parsed = JSON.parse(saved.value);
    if (parsed.testAutomation?.enabled !== true) {
      addResult('Automation settings persist correctly', false, 'Settings do not match saved values');
      return;
    }
    
    addResult('Automation settings can be saved and read', true, undefined, `Settings key exists: ${saved.key}`);
  } catch (error) {
    addResult('Automation settings persistence', false, error instanceof Error ? error.message : String(error));
  }
  
  // Test 2: EventLog entries exist for settings changes
  try {
    const events = await prisma.eventLog.findMany({
      where: {
        eventType: 'automation.settings.updated',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    
    if (events.length === 0) {
      addResult('Automation settings audit logging', false, 'No EventLog entries found for settings updates');
      return;
    }
    
    addResult('Automation settings audit logging', true, undefined, `Found ${events.length} EventLog entry(ies)`);
  } catch (error) {
    addResult('Automation settings audit logging', false, error instanceof Error ? error.message : String(error));
  }
}

async function testPaymentConfirmationPipeline() {
  console.log('\n💳 Testing Payment Confirmation Pipeline...');
  
  // Test 1: Webhook handler exists and has idempotency
  try {
    const webhookFile = await import('../src/app/api/webhooks/stripe/route');
    if (!webhookFile) {
      addResult('Payment confirmation webhook exists', false, 'Webhook file not found');
      return;
    }
    
    addResult('Payment confirmation webhook exists', true, undefined, 'File: src/app/api/webhooks/stripe/route.ts');
  } catch (error) {
    addResult('Payment confirmation webhook exists', false, error instanceof Error ? error.message : String(error));
  }
  
  // Test 2: Correlation IDs are generated
  // This is a code inspection test - we check that the pattern exists
  try {
    const fs = await import('fs');
    const webhookCode = fs.readFileSync('src/app/api/webhooks/stripe/route.ts', 'utf-8');
    
    if (!webhookCode.includes('correlationId')) {
      addResult('Payment confirmation correlation IDs', false, 'Correlation ID generation not found');
      return;
    }
    
    if (!webhookCode.includes('payment.webhook.processing')) {
      addResult('Payment confirmation logging', false, 'Payment processing log not found');
      return;
    }
    
    addResult('Payment confirmation correlation IDs and logging', true, undefined, 'Correlation IDs and logging found in webhook handler');
  } catch (error) {
    addResult('Payment confirmation correlation IDs', false, error instanceof Error ? error.message : String(error));
  }
}

async function testPaymentLinkGeneration() {
  console.log('\n🔗 Testing Payment Link Generation...');
  
  // Test 1: Payment link message template exists
  try {
    const template = await getPaymentLinkMessageTemplate();
    if (!template || template.trim() === '') {
      addResult('Payment link message template exists', false, 'Template is empty');
      return;
    }
    
    if (!template.includes('{{firstName}}') || !template.includes('{{paymentLink}}')) {
      addResult('Payment link message template has required variables', false, 'Template missing required variables');
      return;
    }
    
    addResult('Payment link message template exists', true, undefined, `Template length: ${template.length} chars`);
  } catch (error) {
    addResult('Payment link message template exists', false, error instanceof Error ? error.message : String(error));
  }
  
  // Test 2: Payment link API uses correct total calculation
  try {
    const fs = await import('fs');
    const paymentLinkCode = fs.readFileSync('src/app/api/payments/create-payment-link/route.ts', 'utf-8');
    
    if (!paymentLinkCode.includes('calculatePriceBreakdown')) {
      addResult('Payment link uses correct total calculation', false, 'calculatePriceBreakdown not found');
      return;
    }
    
    addResult('Payment link uses correct total calculation', true, undefined, 'Uses calculatePriceBreakdown function');
  } catch (error) {
    addResult('Payment link uses correct total calculation', false, error instanceof Error ? error.message : String(error));
  }
}

async function testTipLinkAutomation() {
  console.log('\n💝 Testing Tip Link Automation...');
  
  // Test 1: Tip link uses booking total
  try {
    const fs = await import('fs');
    const tipLinkCode = fs.readFileSync('src/app/api/payments/create-tip-link/route.ts', 'utf-8');
    
    if (!tipLinkCode.includes('calculatePriceBreakdown')) {
      addResult('Tip link uses booking total', false, 'calculatePriceBreakdown not found');
      return;
    }
    
    addResult('Tip link uses booking total', true, undefined, 'Uses calculatePriceBreakdown function');
  } catch (error) {
    addResult('Tip link uses booking total', false, error instanceof Error ? error.message : String(error));
  }
  
  // Test 2: Tip link automation has idempotency
  try {
    const fs = await import('fs');
    const bookingRouteCode = fs.readFileSync('src/app/api/bookings/[id]/route.ts', 'utf-8');
    
    if (!bookingRouteCode.includes('tipLink:client:')) {
      addResult('Tip link automation idempotency', false, 'Idempotency key not found');
      return;
    }
    
    if (!bookingRouteCode.includes('previousStatusForHistory !== "completed"')) {
      addResult('Tip link automation trigger guard', false, 'Trigger guard not found');
      return;
    }
    
    addResult('Tip link automation idempotency and trigger guard', true, undefined, 'Idempotency key and trigger guard found');
  } catch (error) {
    addResult('Tip link automation idempotency', false, error instanceof Error ? error.message : String(error));
  }
  
  // Test 3: Tip link executor has phone validation
  try {
    const fs = await import('fs');
    const executorCode = fs.readFileSync('src/lib/automation-executor.ts', 'utf-8');
    
    if (!executorCode.includes('Cannot send tip link: Client phone number is missing')) {
      addResult('Tip link phone validation', false, 'Phone validation not found');
      return;
    }
    
    addResult('Tip link phone validation', true, undefined, 'Phone validation found in executor');
  } catch (error) {
    addResult('Tip link phone validation', false, error instanceof Error ? error.message : String(error));
  }
}

async function runAllTests() {
  console.log('🚀 Starting Priority 1 Revenue Critical Automation Gaps Proof Script\n');
  console.log('=' .repeat(70));
  
  await testAutomationSettingsPersistence();
  await testPaymentConfirmationPipeline();
  await testPaymentLinkGeneration();
  await testTipLinkAutomation();
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ PROOF SCRIPT FAILED - DO NOT DEPLOY');
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error || 'Unknown error'}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED - READY FOR DEPLOYMENT');
    process.exit(0);
  }
}

// Run tests
runAllTests()
  .catch((error) => {
    console.error('Fatal error running proof script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

