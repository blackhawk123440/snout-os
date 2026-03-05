import { initializeQueues } from "@/lib/queue";
import { initWorkerSentry } from "@/lib/worker-sentry";
import { getRuntimeEnvName, isRedisRequiredEnv } from "@/lib/runtime-env";

initWorkerSentry();

export async function startWorkers() {
  const redisUrl = process.env.REDIS_URL;
  const commitSha =
    process.env.NEXT_PUBLIC_GIT_SHA ||
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'unknown';
  if (isRedisRequiredEnv() && !redisUrl) {
    throw new Error(`REDIS_URL is required to start workers in ${getRuntimeEnvName()}`);
  }
  console.log("[Worker] Starting background workers...");
  console.log("[Worker] commitSha:", commitSha.slice(0, 7));
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