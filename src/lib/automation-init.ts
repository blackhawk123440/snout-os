/**
 * Automation Engine Initialization
 * 
 * This file initializes the automation engine when the app starts.
 * Import this file early in the application lifecycle.
 */

import { initializeAutomationEngine } from "./automation-engine";

let initialized = false;

export function initAutomationEngine() {
  if (initialized) {
    return;
  }
  
  try {
    initializeAutomationEngine();
    initialized = true;
    
    if (process.env.NODE_ENV !== "test") {
      console.log("✅ Automation Engine initialized");
    }
  } catch (error) {
    console.error("❌ Failed to initialize Automation Engine:", error);
    // Don't throw - allow app to continue without automations
  }
}

// Auto-initialize when module is imported (server-side only)
if (typeof window === "undefined") {
  // Use setImmediate to ensure it runs after module loading
  if (typeof setImmediate !== "undefined") {
    setImmediate(() => initAutomationEngine());
  } else {
    // Fallback for environments without setImmediate
    setTimeout(() => initAutomationEngine(), 0);
  }
}

