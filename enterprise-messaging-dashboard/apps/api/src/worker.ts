/**
 * Worker Entry Point
 * 
 * Starts BullMQ workers for:
 * - Message retry queue
 * - Automation queue
 * - Pool release jobs
 * 
 * This is a separate entry point from main.ts to run workers
 * in a separate Render Background Worker service.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MessageRetryWorker } from './workers/message-retry.worker';
import { AutomationWorker } from './workers/automation.worker';
import { ProofWorker } from './workers/proof.worker';

async function bootstrap() {
  // Create minimal NestJS app context for workers
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Get worker instances from the module
  const messageRetryWorker = app.get(MessageRetryWorker);
  const automationWorker = app.get(AutomationWorker);
  const proofWorker = app.get(ProofWorker);
  
  // Workers start automatically via OnModuleInit
  console.log('🚀 Workers started:');
  console.log('  - Message Retry Worker');
  console.log('  - Automation Worker');
  console.log('  - Proof Worker');
  console.log('  - Pool Release Jobs (via API)');
  
  // Keep process alive
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down workers...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start workers:', error);
  process.exit(1);
});
