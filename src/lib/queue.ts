import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Create queues
export const reminderQueue = new Queue("reminders", { connection });
export const summaryQueue = new Queue("daily-summary", { connection });
export const reconciliationQueue = new Queue("reconciliation", { connection }); // Phase 7.2: Price reconciliation

// Create workers
export const reminderWorker = new Worker(
  "reminders",
  async (job) => {
    const { processReminders } = await import("../worker/automation-worker");
    return await processReminders();
  },
  { connection }
);

export const summaryWorker = new Worker(
  "daily-summary",
  async (job) => {
    const { processDailySummary } = await import("../worker/automation-worker");
    return await processDailySummary();
  },
  { connection }
);

// Phase 7.2: Pricing reconciliation worker
export const reconciliationWorker = new Worker(
  "reconciliation",
  async (job) => {
    const { processPricingReconciliation } = await import("../worker/reconciliation-worker");
    return await processPricingReconciliation();
  },
  { connection }
);

// Schedule jobs
export async function scheduleReminders() {
  // Schedule reminder processing every hour
  await reminderQueue.add(
    "process-reminders",
    {},
    {
      repeat: {
        pattern: "0 * * * *", // Every hour
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
}

export async function scheduleDailySummary() {
  // Schedule daily summary at 9 PM
  await summaryQueue.add(
    "process-daily-summary",
    {},
    {
      repeat: {
        pattern: "0 21 * * *", // 9 PM daily
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
}

// Phase 7.2: Schedule pricing reconciliation
// Per Master Spec Section 5.3: Pricing drift detection
export async function scheduleReconciliation() {
  // Schedule reconciliation daily at 2 AM (low traffic time)
  await reconciliationQueue.add(
    "process-pricing-reconciliation",
    {},
    {
      repeat: {
        pattern: "0 2 * * *", // 2 AM daily
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
}

// Initialize queues
export async function initializeQueues() {
  try {
    await scheduleReminders();
    await scheduleDailySummary();
    await scheduleReconciliation(); // Phase 7.2: Pricing reconciliation
    
    // Phase 3.3: Initialize automation worker
    // Per Master Spec Line 259: "Move every automation execution to the worker queue"
    const { initializeAutomationWorker } = await import("./automation-queue");
    initializeAutomationWorker();
  } catch (error) {
    console.error("Failed to initialize queues:", error);
  }
}