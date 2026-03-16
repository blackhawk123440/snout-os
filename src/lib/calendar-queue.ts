/**
 * Calendar sync queue - one-way Snout OS → Google
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getScopedDb } from '@/lib/tenancy';
import { upsertEventForBooking, deleteEventForBooking, syncRangeForSitter } from '@/lib/calendar/sync';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';
import { attachQueueWorkerInstrumentation, recordQueueJobQueued } from '@/lib/queue-observability';
import { resolveCorrelationId } from '@/lib/correlation-id';
import { processInboundReconcileJob, type InboundExternalEvent } from '@/lib/calendar/bidirectional-adapter';

const DEAD_LETTER_AFTER_ATTEMPTS = 5;

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const calendarQueue = new Queue('calendar-sync', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export type CalendarJobType =
  | { type: 'upsert'; bookingId: string; orgId: string; correlationId?: string }
  | { type: 'delete'; bookingId: string; sitterId: string; orgId: string; correlationId?: string }
  | { type: 'syncRange'; sitterId: string; start: string; end: string; orgId: string; correlationId?: string }
  | { type: 'inboundReconcile'; sitterId: string; orgId: string; events?: InboundExternalEvent[]; correlationId?: string };

export async function enqueueCalendarSync(job: CalendarJobType): Promise<string | null> {
  const jobCorrelationId = job.correlationId ?? resolveCorrelationId();
  const payload = { ...job, correlationId: jobCorrelationId };
  const j = await calendarQueue.add(`calendar:${job.type}`, payload, {
    jobId: job.type === 'upsert'
      ? `upsert:${job.bookingId}`
      : job.type === 'delete'
        ? `delete:${job.bookingId}:${job.sitterId}`
        : undefined,
  });
  await recordQueueJobQueued({
    queueName: calendarQueue.name,
    jobName: `calendar:${job.type}`,
    jobId: String(j.id),
    orgId: job.orgId ?? "default",
    subsystem: "calendar",
    resourceType: job.type === "syncRange" || job.type === "inboundReconcile" ? "sitter" : "booking",
    resourceId: job.type === "syncRange" || job.type === "inboundReconcile" ? job.sitterId : job.bookingId,
    correlationId: jobCorrelationId,
    payload: payload as Record<string, unknown>,
  });
  return j?.id ?? null;
}

function createCalendarWorker(): Worker {
  const workerInstance = new Worker(
    'calendar-sync',
    async (job) => {
      const data = job.data as CalendarJobType;
      const db = getScopedDb({ orgId: data.orgId });

      if (data.type === 'upsert') {
        const result = await upsertEventForBooking(db, data.bookingId, data.orgId);
        await logEvent({
          orgId: data.orgId,
          actorUserId: 'system',
          action: 'calendar.sync.succeeded',
          entityType: 'calendar',
          entityId: data.bookingId,
          correlationId: data.correlationId,
          metadata: { bookingId: data.bookingId, action: result.action, ...(result.error && { error: result.error }) },
        });
        return result;
      }

      if (data.type === 'delete') {
        const result = await deleteEventForBooking(db, data.bookingId, data.sitterId, data.orgId);
        await logEvent({
          orgId: data.orgId,
          actorUserId: 'system',
          action: result.deleted ? 'calendar.sync.succeeded' : 'calendar.sync.failed',
          entityType: 'calendar',
          entityId: data.bookingId,
          correlationId: data.correlationId,
          metadata: { bookingId: data.bookingId, sitterId: data.sitterId, deleted: result.deleted, error: result.error },
        });
        return result;
      }

      if (data.type === 'syncRange') {
        const result = await syncRangeForSitter(
          db,
          data.sitterId,
          new Date(data.start),
          new Date(data.end),
          data.orgId
        );
        await logEvent({
          orgId: data.orgId,
          actorUserId: 'system',
          action: 'calendar.repair.succeeded',
          entityType: 'calendar',
          entityId: data.sitterId,
          correlationId: data.correlationId,
          metadata: { sitterId: data.sitterId, ...result },
        });
        return result;
      }

      if (data.type === 'inboundReconcile') {
        const result = await processInboundReconcileJob(
          {
            orgId: data.orgId,
            sitterId: data.sitterId,
            events: data.events,
            correlationId: data.correlationId,
          },
          {
            observe: async (eventName, payload) => {
              await logEvent({
                orgId: data.orgId,
                actorUserId: 'system',
                action: eventName,
                entityType: 'calendar',
                entityId: data.sitterId,
                correlationId: data.correlationId,
                metadata: payload,
              });
            },
          }
        );
        await logEvent({
          orgId: data.orgId,
          actorUserId: 'system',
          action: 'calendar.inbound.processed',
          entityType: 'calendar',
          entityId: data.sitterId,
          correlationId: data.correlationId,
          metadata: result as unknown as Record<string, unknown>,
        });
        return result;
      }

      throw new Error(`Unknown calendar job type: ${(data as any).type}`);
    },
    {
      connection,
      concurrency: 2,
    }
  );
  attachQueueWorkerInstrumentation(workerInstance, (job) => {
    const data = job.data as CalendarJobType;
    return {
      orgId: data.orgId ?? "default",
      subsystem: "calendar",
      resourceType: data.type === "syncRange" || data.type === "inboundReconcile" ? "sitter" : "booking",
      resourceId: data.type === "syncRange" || data.type === "inboundReconcile" ? data.sitterId : data.bookingId,
      correlationId: data.correlationId,
      payload: data as Record<string, unknown>,
    };
  });
  return workerInstance;
}

let worker: Worker | null = null;

export function initializeCalendarWorker(): Worker {
  if (worker) return worker;
  worker = createCalendarWorker();

  worker.on('failed', async (job, err) => {
    const data = job?.data as CalendarJobType | undefined;
    try {
      const { captureWorkerError } = await import('@/lib/worker-sentry');
      captureWorkerError(err instanceof Error ? err : new Error(String(err)), {
        jobName: `calendar:${data?.type}`,
        orgId: data?.orgId,
        bookingId: (data as any)?.bookingId,
        correlationId: data?.correlationId,
      });
    } catch (_) {}
    const attempts = (job?.attemptsMade ?? 0) + 1;
    const isRepair = data?.type === 'syncRange';
    const action = isRepair ? 'calendar.repair.failed' : 'calendar.sync.failed';
    if (data?.orgId) {
      await logEvent({
        orgId: data.orgId,
        actorUserId: 'system',
        action,
        entityType: 'calendar',
        entityId: (data as any).bookingId || (data as any).sitterId || 'unknown',
        status: 'failed',
        correlationId: data.correlationId,
        metadata: { error: (err as Error).message, jobData: data, attempts },
      });
      publish(channels.opsFailures(data.orgId), {
        type: action,
        ts: Date.now(),
      }).catch(() => {});
    }
    if (job && attempts >= DEAD_LETTER_AFTER_ATTEMPTS) {
      try {
        await logEvent({
          orgId: data?.orgId ?? 'default',
          actorUserId: 'system',
          action: 'calendar.dead',
          entityType: 'calendar',
          entityId: (data as any)?.bookingId || (data as any)?.sitterId || 'unknown',
          status: 'failed',
          correlationId: data?.correlationId,
          metadata: {
            error: (err as Error).message,
            jobData: data,
            jobId: job.id,
            attempts,
          },
        });
        publish(channels.opsFailures(data?.orgId ?? 'default'), {
          type: 'calendar.dead',
          ts: Date.now(),
        }).catch(() => {});
      } catch (e) {
        console.error('[Calendar Queue] Failed to log dead letter:', e);
      }
    }
  });

  return worker;
}
