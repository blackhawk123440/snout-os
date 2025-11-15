import { initializeQueues } from "@/lib/queue";

export async function startWorkers() {
  try {
    await initializeQueues();
  } catch (error) {
    console.error("Failed to start background workers:", error);
  }
}

if (typeof window === "undefined") {
  startWorkers();
}