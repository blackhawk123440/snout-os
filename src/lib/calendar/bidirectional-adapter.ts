/**
 * Google -> Snout inbound sync adapter scaffold.
 *
 * This module is intentionally non-invasive:
 * - Disabled by default behind ENABLE_GOOGLE_BIDIRECTIONAL_SYNC
 * - No direct booking mutations yet
 * - Reuses existing correlation and logging patterns
 *
 * Future integration should keep this additive to outbound sync in calendar/sync.ts.
 */

import { resolveCorrelationId } from "@/lib/correlation-id";
import { ENABLE_GOOGLE_BIDIRECTIONAL_SYNC } from "@/lib/flags";

export type InboundExternalEventAction = "moved" | "deleted" | "upserted";

export interface InboundExternalEvent {
  externalEventId: string;
  action: InboundExternalEventAction;
  startAt?: string;
  endAt?: string;
  updatedAt?: string;
}

export interface InboundReconcileJobPayload {
  orgId: string;
  sitterId: string;
  correlationId?: string;
  events?: InboundExternalEvent[];
}

export interface InboundReconcileResult {
  status: "disabled" | "no_events" | "processed";
  correlationId: string;
  movedDetected: number;
  deletedDetected: number;
  duplicatePrevented: number;
  conflictCandidates: number;
}

export interface InboundAdapterObservabilityHook {
  (eventName: string, payload: Record<string, unknown>): Promise<void> | void;
}

export interface InboundAdapterDeps {
  observe?: InboundAdapterObservabilityHook;
  enabled?: boolean;
}

export async function processInboundReconcileJob(
  payload: InboundReconcileJobPayload,
  deps: InboundAdapterDeps = {}
): Promise<InboundReconcileResult> {
  const correlationId = resolveCorrelationId(undefined, payload.correlationId);
  const enabled = deps.enabled ?? ENABLE_GOOGLE_BIDIRECTIONAL_SYNC;

  if (!enabled) {
    await deps.observe?.("calendar.inbound.skipped", {
      orgId: payload.orgId,
      sitterId: payload.sitterId,
      reason: "flag_disabled",
      correlationId,
    });
    return {
      status: "disabled",
      correlationId,
      movedDetected: 0,
      deletedDetected: 0,
      duplicatePrevented: 0,
      conflictCandidates: 0,
    };
  }

  const inputEvents = payload.events ?? [];
  if (inputEvents.length === 0) {
    await deps.observe?.("calendar.inbound.no_events", {
      orgId: payload.orgId,
      sitterId: payload.sitterId,
      correlationId,
    });
    return {
      status: "no_events",
      correlationId,
      movedDetected: 0,
      deletedDetected: 0,
      duplicatePrevented: 0,
      conflictCandidates: 0,
    };
  }

  // Duplicate ingestion prevention placeholder.
  const seen = new Set<string>();
  const uniqueEvents: InboundExternalEvent[] = [];
  let duplicatePrevented = 0;
  for (const event of inputEvents) {
    const dedupeKey = `${event.externalEventId}:${event.updatedAt ?? "na"}:${event.action}`;
    if (seen.has(dedupeKey)) {
      duplicatePrevented++;
      continue;
    }
    seen.add(dedupeKey);
    uniqueEvents.push(event);
  }

  let movedDetected = 0;
  let deletedDetected = 0;
  let conflictCandidates = 0;

  for (const event of uniqueEvents) {
    if (event.action === "moved") {
      movedDetected++;
      conflictCandidates++;
      await deps.observe?.("calendar.inbound.event_moved", {
        orgId: payload.orgId,
        sitterId: payload.sitterId,
        externalEventId: event.externalEventId,
        startAt: event.startAt,
        endAt: event.endAt,
        correlationId,
      });
      continue;
    }

    if (event.action === "deleted") {
      deletedDetected++;
      await deps.observe?.("calendar.inbound.event_deleted", {
        orgId: payload.orgId,
        sitterId: payload.sitterId,
        externalEventId: event.externalEventId,
        correlationId,
      });
      continue;
    }

    // Placeholder for external creates/updates that don't map to tracked booking events.
    await deps.observe?.("calendar.inbound.event_upserted", {
      orgId: payload.orgId,
      sitterId: payload.sitterId,
      externalEventId: event.externalEventId,
      correlationId,
    });
  }

  // Conflict marking / reconciliation placeholder (intentionally no direct write path yet).
  await deps.observe?.("calendar.inbound.conflict_marking.placeholder", {
    orgId: payload.orgId,
    sitterId: payload.sitterId,
    conflictCandidates,
    correlationId,
  });

  return {
    status: "processed",
    correlationId,
    movedDetected,
    deletedDetected,
    duplicatePrevented,
    conflictCandidates,
  };
}
