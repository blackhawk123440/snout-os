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
  
  initializeAutomationEngine();
  initialized = true;
  
  console.log("✅ Automation Engine initialized");
}

// Auto-initialize when module is imported (server-side only)
if (typeof window === "undefined") {
  initAutomationEngine();
}

