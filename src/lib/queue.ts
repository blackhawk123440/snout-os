import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { attachQueueWorkerInstrumentation, recordQueueJobQueued } from "@/lib/queue-observability";
import { resolveCorrelationId } from "@/lib/correlation-id";

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
attachQueueWorkerInstrumentation(summaryWorker, (job) => ({
  orgId: "default",
  subsystem: "summary",
  resourceType: "system",
  resourceId: "daily-summary",
  correlationId: (job.data as any)?.correlationId,
  payload: job.data as Record<string, unknown>,
}));

// Phase 7.2: Pricing reconciliation worker
export const reconciliationWorker = new Worker(
  "reconciliation",
  async (job) => {
    const { processPricingReconciliation } = await import("../worker/reconciliation-worker");
    return await processPricingReconciliation();
  },
  { connection }
);
attachQueueWorkerInstrumentation(reconciliationWorker, (job) => ({
  orgId: "default",
  subsystem: "reconciliation",
  resourceType: "system",
  resourceId: "pricing-reconciliation",
  correlationId: (job.data as any)?.correlationId,
  payload: job.data as Record<string, unknown>,
}));

// Reminder scheduling: see reminder-scheduler-queue.ts (org-scoped, no global scan)

export async function scheduleDailySummary() {
  // Schedule daily summary at 9 PM
  const correlationId = resolveCorrelationId();
  const job = await summaryQueue.add(
    "process-daily-summary",
    { correlationId },
    {
      repeat: {
        pattern: "0 21 * * *", // 9 PM daily
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
  await recordQueueJobQueued({
    queueName: summaryQueue.name,
    jobName: "process-daily-summary",
    jobId: String(job.id),
    orgId: "default",
    subsystem: "summary",
    resourceType: "system",
    resourceId: "daily-summary",
    correlationId,
    payload: { correlationId },
  });
}

// Phase 7.2: Schedule pricing reconciliation
// Per Master Spec Section 5.3: Pricing drift detection
export async function scheduleReconciliation() {
  // Schedule reconciliation daily at 2 AM (low traffic time)
  const correlationId = resolveCorrelationId();
  const job = await reconciliationQueue.add(
    "process-pricing-reconciliation",
    { correlationId },
    {
      repeat: {
        pattern: "0 2 * * *", // 2 AM daily
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
  await recordQueueJobQueued({
    queueName: reconciliationQueue.name,
    jobName: "process-pricing-reconciliation",
    jobId: String(job.id),
    orgId: "default",
    subsystem: "reconciliation",
    resourceType: "system",
    resourceId: "pricing-reconciliation",
    correlationId,
    payload: { correlationId },
  });
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
    console.log("[Worker] Automations queue ready");

    // Calendar sync worker (one-way Snout → Google)
    const { initializeCalendarWorker } = await import("./calendar-queue");
    initializeCalendarWorker();
    console.log("[Worker] Calendar queue ready");

    // Initialize pool release worker (runs every 5 minutes)
    const { initializePoolReleaseWorker, schedulePoolRelease } = await import("./pool-release-queue");
    initializePoolReleaseWorker();
    await schedulePoolRelease();

    // Payout worker (Stripe Connect transfers on booking completion)
    const { initializePayoutWorker } = await import("./payout/payout-queue");
    initializePayoutWorker();
    console.log("[Worker] Payout queue ready");

    // Finance reconciliation worker (ledger vs Stripe)
    const { initializeFinanceReconcileWorker } = await import("./finance/reconcile-queue");
    initializeFinanceReconcileWorker();
  } catch (error) {
    console.error("Failed to initialize queues:", error);
  }
}