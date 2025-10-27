// Main worker entry point
// Runs all automation workers for Snout OS

console.log("🚀 Snout OS Worker System Starting...");
console.log("=====================================");

// Import all workers
import "./automation-worker";

console.log("=====================================");
console.log("✅ All workers initialized and running");
console.log("");
console.log("Automations active:");
console.log("  ✓ SMS sending");
console.log("  ✓ Night-before reminders");
console.log("  ✓ Tip & review reminders");
console.log("  ✓ Daily summaries");
console.log("  ✓ Post-visit follow-ups");
console.log("");
console.log("Press Ctrl+C to stop");
