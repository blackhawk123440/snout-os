/**
 * Pool Release Queue
 * 
 * BullMQ scheduled job that runs every 5 minutes to release pool numbers
 * based on rotation settings.
 * 
 * NOTE: Disabled for web service - should only run in API/Worker services
 */

// Stub exports to prevent import errors
// Full implementation should be in API/Worker service only
export const poolReleaseQueue: any = null;
export function createPoolReleaseWorker(): any { return null; }
export async function schedulePoolRelease(): Promise<void> { /* no-op */ }
export function initializePoolReleaseWorker(): any { return null; }
