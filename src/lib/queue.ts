import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Create queues
export const reminderQueue = new Queue("reminders", { connection });
export const summaryQueue = new Queue("daily-summary", { connection });

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

// Initialize queues
export async function initializeQueues() {
  try {
    await scheduleReminders();
    await scheduleDailySummary();
  } catch (error) {
    console.error("Failed to initialize queues:", error);
  }
}