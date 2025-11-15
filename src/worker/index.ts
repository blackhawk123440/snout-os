import { initializeQueues } from "@/lib/queue";
import { startAutomationWorker } from "./automation-worker";

let cleanupAutomationWorker: (() => void) | null = null;

export async function startWorkers() {
  try {
    await initializeQueues();
    // Start automation worker and store cleanup function
    cleanupAutomationWorker = await startAutomationWorker();
  } catch (error) {
    console.error("Failed to start background workers:", error);
  }
}

export function stopWorkers() {
  if (cleanupAutomationWorker) {
    cleanupAutomationWorker();
    cleanupAutomationWorker = null;
  }
}

// Handle graceful shutdown
if (typeof window === "undefined") {
  startWorkers();
  
  // Graceful shutdown handlers
  const shutdown = () => {
    console.log("Shutting down workers...");
    stopWorkers();
    process.exit(0);
  };
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}