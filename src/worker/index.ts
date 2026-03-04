import { initializeQueues } from "@/lib/queue";
import { initWorkerSentry } from "@/lib/worker-sentry";
import { getRuntimeEnvName, isRedisRequiredEnv } from "@/lib/runtime-env";

initWorkerSentry();

export async function startWorkers() {
  const redisUrl = process.env.REDIS_URL;
  if (isRedisRequiredEnv() && !redisUrl) {
    throw new Error(`REDIS_URL is required to start workers in ${getRuntimeEnvName()}`);
  }
  console.log("[Worker] Starting background workers...");
  console.log("[Worker] REDIS_URL:", redisUrl ? redisUrl.replace(/:[^:@]+@/, ":****@") : "(missing)");
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