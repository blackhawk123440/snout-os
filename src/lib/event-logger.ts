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
 * Log an automation run event to EventLog.
 * Use for automation.execute, automation.failed, etc.
 */
export async function logAutomationRun(
  automationType: string,
  status: EventLogStatus,
  options?: {
    orgId?: string;
    bookingId?: string;
    error?: string;
    metadata?: EventLogMetadata;
  }
): Promise<void> {
  try {
    await (prisma as any).eventLog.create({
      data: {
        orgId: options?.orgId ?? 'default',
        eventType: status === 'failed' ? 'automation.failed' : `automation.run.${automationType}`,
        automationType,
        status,
        error: options?.error ?? null,
        bookingId: options?.bookingId ?? null,
        metadata: JSON.stringify({
          automationType,
          ...options?.metadata,
        }),
      },
    });
  } catch (error) {
    console.error("[EventLog] Failed to log automation run:", error);
  }
}

/**
 * Log a general event (not automation-specific) to EventLog.
 * Used by messaging, pricing-reconciliation, etc.
 * Prefer logEvent from @/lib/log-event for booking/payment events.
 */
export async function logEventFromLogger(
  eventType: string,
  status: EventLogStatus,
  options?: {
    orgId?: string;
    bookingId?: string;
    error?: string;
    metadata?: EventLogMetadata;
  }
): Promise<void> {
  try {
    await (prisma as any).eventLog.create({
      data: {
        orgId: options?.orgId ?? 'default',
        eventType,
        status,
        error: options?.error ?? null,
        bookingId: options?.bookingId ?? null,
        metadata: JSON.stringify(options?.metadata ?? {}),
      },
    });
  } catch (error) {
    console.error("[EventLog] Failed to log event:", error);
  }
}

/**
 * Log a general event. Alias for logEventFromLogger.
 * Signature: (eventType, status, options) for backward compatibility with messaging/pricing-reconciliation.
 */
export async function logEvent(
  eventType: string,
  status: EventLogStatus,
  options?: {
    orgId?: string;
    bookingId?: string;
    error?: string;
    metadata?: EventLogMetadata;
  }
): Promise<void> {
  return logEventFromLogger(eventType, status, options);
}

