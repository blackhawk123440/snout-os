/**
 * Automation Queue
 * 
 * Per Master Spec Line 259: "Move every automation execution to the worker queue"
 * Line 6.2.1: "Triggers produce durable jobs in Redis queue"
 * Line 6.2.2: "Worker processes jobs with retries, backoff, and idempotency keys"
 * Line 6.2.3: "Each automation run writes an EventLog record with inputs, outputs, and errors"
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { logAutomationRun, logEventFromLogger } from "./event-logger";
import { publish, channels } from "@/lib/realtime/bus";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Create automation queue
export const automationQueue = new Queue("automations", { 
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 seconds, exponential backoff
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

/**
 * Job data for automation execution
 */
export interface AutomationJobData {
  automationType: string; // e.g., "ownerNewBookingAlert", "bookingConfirmation", "nightBeforeReminder"
  recipient: "client" | "sitter" | "owner"; // Who to send to
  context: {
    bookingId?: string;
    sitterId?: string;
    [key: string]: any; // Additional context data
  };
  idempotencyKey?: string; // Optional idempotency key to prevent duplicate execution
}

/**
 * Enqueue an automation job
 * This is the new way to trigger automations - jobs are processed by the worker
 */
export async function enqueueAutomation(
  automationType: string,
  recipient: "client" | "sitter" | "owner",
  context: AutomationJobData["context"],
  idempotencyKey?: string
): Promise<void> {
  const jobData: AutomationJobData = {
    automationType,
    recipient,
    context,
    idempotencyKey,
  };

  const jobOptions: any = {
    jobId: idempotencyKey, // Use idempotency key as job ID to prevent duplicates
  };

  await automationQueue.add(`automation:${automationType}:${recipient}`, jobData, jobOptions);
}

/**
 * Create worker for processing automation jobs
 * This worker will execute automations and write EventLog records
 */
export function createAutomationWorker(): Worker {
  return new Worker(
    "automations",
    async (job) => {
      const { automationType, recipient, context } = job.data as AutomationJobData;
      const jobId = job.id;
      
      // Log that automation run started
      await logAutomationRun(
        automationType,
        "pending",
        {
          bookingId: context.bookingId,
          metadata: { 
            jobId, 
            recipient, 
            context,
            message: `Starting automation: ${automationType} for ${recipient}`
          }
        }
      );

      try {
        // Import automation execution logic
        const { executeAutomationForRecipient } = await import("./automation-executor");
        
        // Execute the automation
        const result = await executeAutomationForRecipient(automationType, recipient, context);
        
        // Log success
        await logAutomationRun(
          automationType,
          "success",
          {
            bookingId: context.bookingId,
            metadata: {
              jobId,
              recipient,
              result,
              message: `Automation executed successfully: ${automationType} for ${recipient}`
            }
          }
        );

        return result;
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        const orgId = (context as any).orgId ?? 'default';

        // Log automation.failed to EventLog for admin visibility (include context for retry)
        await logAutomationRun(
          automationType,
          "failed",
          {
            orgId,
            bookingId: context.bookingId,
            error: errorMessage,
            metadata: {
              jobId,
              recipient,
              context,
              stack: error?.stack,
              message: `Automation failed: ${automationType} for ${recipient} - ${errorMessage}`,
            },
          }
        );

        throw error;
      }
    },
    { 
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );
}

/**
 * Initialize automation worker
 * Call this when the application starts
 */
let automationWorker: Worker | null = null;

const DEAD_LETTER_AFTER_ATTEMPTS = 3;

export function initializeAutomationWorker(): Worker {
  if (!automationWorker) {
    automationWorker = createAutomationWorker();
    
    automationWorker.on("completed", (job) => {
      console.log(`[Automation Queue] Job ${job.id} completed: ${job.data.automationType} for ${job.data.recipient}`);
    });
    
    automationWorker.on("failed", async (job, err) => {
      console.error(`[Automation Queue] Job ${job?.id} failed: ${job?.data?.automationType} for ${job?.data?.recipient}`, err);
      try {
        const { captureWorkerError } = await import("@/lib/worker-sentry");
        captureWorkerError(err instanceof Error ? err : new Error(String(err)), {
          jobName: `automation:${(job?.data as any)?.automationType}`,
          orgId: (job?.data as any)?.context?.orgId,
          bookingId: (job?.data as any)?.context?.bookingId,
        });
      } catch (_) {}
      const attempts = (job?.attemptsMade ?? 0) + 1;
      if (job && attempts >= DEAD_LETTER_AFTER_ATTEMPTS) {
        try {
          const orgId = (job.data as any).context?.orgId ?? "default";
          await logEventFromLogger("automation.dead", "failed", {
            orgId,
            bookingId: (job.data as any).context?.bookingId,
            error: err?.message || String(err),
            metadata: {
              automationType: (job.data as AutomationJobData).automationType,
              recipient: (job.data as AutomationJobData).recipient,
              context: (job.data as AutomationJobData).context,
              jobId: job.id,
              attempts,
            },
          });
          publish(channels.opsFailures(orgId), { type: "automation.dead", ts: Date.now() }).catch(() => {});
        } catch (e) {
          console.error("[Automation Queue] Failed to log dead letter:", e);
        }
      }
    });
  }
  
  return automationWorker;
}

