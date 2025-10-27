import { initializeQueues } from "@/lib/queue";

// Initialize background job queues
export async function startWorkers() {
  try {
    await initializeQueues();
    console.log("Background workers started successfully");
  } catch (error) {
    console.error("Failed to start background workers:", error);
  }
}

// Start workers when this module is imported
if (typeof window === "undefined") {
  startWorkers();
}