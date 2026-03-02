import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Create queues
export const summaryQueue = new Queue("daily-summary", { connection });
export const reconciliationQueue = new Queue("reconciliation", { connection }); // Phase 7.2: Price reconciliation

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

// Reminder scheduling: see reminder-scheduler-queue.ts (org-scoped, no global scan)

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
    const { scheduleReminderDispatcher, initializeReminderSchedulerWorker } = await import(
      "./reminder-scheduler-queue"
    );
    await scheduleReminderDispatcher();
    initializeReminderSchedulerWorker();

    await scheduleDailySummary();
    await scheduleReconciliation(); // Phase 7.2: Pricing reconciliation
    
    // Phase 3.3: Initialize automation worker
    const { initializeAutomationWorker } = await import("./automation-queue");
    initializeAutomationWorker();

    // Calendar sync worker (one-way Snout → Google)
    const { initializeCalendarWorker } = await import("./calendar-queue");
    initializeCalendarWorker();

    // Initialize pool release worker (runs every 5 minutes)
    const { initializePoolReleaseWorker, schedulePoolRelease } = await import("./pool-release-queue");
    initializePoolReleaseWorker();
    await schedulePoolRelease();

    // Payout worker (Stripe Connect transfers on booking completion)
    const { initializePayoutWorker } = await import("./payout/payout-queue");
    initializePayoutWorker();

    // Finance reconciliation worker (ledger vs Stripe)
    const { initializeFinanceReconcileWorker } = await import("./finance/reconcile-queue");
    initializeFinanceReconcileWorker();
  } catch (error) {
    console.error("Failed to initialize queues:", error);
  }
}