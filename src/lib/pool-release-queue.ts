/**
 * Pool Release Queue
 * 
 * BullMQ scheduled job that runs every 5 minutes to release pool numbers
 * based on rotation settings.
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { releasePoolNumbers } from "./messaging/pool-release-job";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Create pool release queue
export const poolReleaseQueue = new Queue("pool-release", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

/**
 * Create worker for processing pool release jobs
 */
export function createPoolReleaseWorker(): Worker {
  return new Worker(
    "pool-release",
    async (job) => {
      console.log(`[Pool Release Queue] Processing job ${job.id}`);
      const stats = await releasePoolNumbers();
      console.log(`[Pool Release Queue] Job ${job.id} completed:`, stats);
      return stats;
    },
    {
      connection,
      concurrency: 1, // Process one job at a time
    }
  );
}

/**
 * Schedule pool release job (runs every 5 minutes)
 */
export async function schedulePoolRelease(): Promise<void> {
  // Remove any existing repeatable jobs first
  const repeatableJobs = await poolReleaseQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await poolReleaseQueue.removeRepeatableByKey(job.key);
  }

  // Schedule new repeatable job (every 5 minutes)
  await poolReleaseQueue.add(
    "release-pool-numbers",
    {},
    {
      repeat: {
        pattern: "*/5 * * * *", // Every 5 minutes
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );

  console.log("[Pool Release Queue] Scheduled repeatable job (every 5 minutes)");
}

/**
 * Initialize pool release worker and schedule
 */
let poolReleaseWorker: Worker | null = null;

export function initializePoolReleaseWorker(): Worker {
  if (!poolReleaseWorker) {
    poolReleaseWorker = createPoolReleaseWorker();

    poolReleaseWorker.on("completed", (job) => {
      console.log(`[Pool Release Queue] Job ${job.id} completed`);
    });

    poolReleaseWorker.on("failed", (job, err) => {
      console.error(`[Pool Release Queue] Job ${job?.id} failed:`, err);
    });
  }

  return poolReleaseWorker;
}
