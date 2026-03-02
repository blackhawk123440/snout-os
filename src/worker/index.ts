import { initializeQueues } from "@/lib/queue";
import { initWorkerSentry } from "@/lib/worker-sentry";

initWorkerSentry();

export async function startWorkers() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  console.log("[Worker] Starting background workers...");
  console.log("[Worker] REDIS_URL:", redisUrl.replace(/:[^:@]+@/, ":****@")); // Redact password
  try {
    await initializeQueues();
    console.log("[Worker] Queues initialized. Processing jobs.");
  } catch (error) {
    console.error("[Worker] Failed to start background workers:", error);
    throw error;
  }
}

if (typeof window === "undefined") {
  startWorkers();
}