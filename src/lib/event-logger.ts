/**
 * Event Logger
 * 
 * Master Spec Reference: Line 257 (Phase 3)
 * "Add an automation run ledger page that shows last runs and failures"
 * 
 * Per master spec, EventLog is the audit backbone for every critical mutation.
 * This module provides functions to log events to the EventLog table.
 */

import { prisma } from "@/lib/db";

export type EventLogStatus = "success" | "failed" | "skipped" | "pending";

export interface EventLogMetadata {
  [key: string]: any;
}

/**
 * Log an automation run event
 * 
 * Use this to log when an automation executes, succeeds, or fails.
 */
export async function logAutomationRun(
  automationType: string,
  status: EventLogStatus,
  options?: {
    bookingId?: string;
    error?: string;
    metadata?: EventLogMetadata;
  }
): Promise<void> {
  try {
    // Note: API schema uses AuditEvent, not eventLog
    // For messaging dashboard, use AuditEvent model
    // This is a stub - full logging handled by NestJS API
    console.log(`[EventLog] Would log automation run: ${automationType}, status: ${status}`);
  } catch (error) {
    // Don't throw - logging failures shouldn't break the application
    console.error("[EventLog] Failed to log automation run:", error);
  }
}

/**
 * Log a general event (not automation-specific)
 * 
 * Use this for other events like booking.created, payment.success, etc.
 */
export async function logEvent(
  eventType: string,
  status: EventLogStatus,
  options?: {
    bookingId?: string;
    error?: string;
    metadata?: EventLogMetadata;
  }
): Promise<void> {
  try {
    // Note: API schema uses AuditEvent, not eventLog
    // For messaging dashboard, use AuditEvent model
    // This is a stub - full logging handled by NestJS API
    console.log(`[EventLog] Would log event: ${eventType}, status: ${status}`);
  } catch (error) {
    // Don't throw - logging failures shouldn't break the application
    console.error("[EventLog] Failed to log event:", error);
  }
}

