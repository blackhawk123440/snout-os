/**
 * Calendar sync queue - one-way Snout OS → Google
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { getScopedDb } from '@/lib/tenancy';
import { upsertEventForBooking, deleteEventForBooking, syncRangeForSitter } from '@/lib/calendar/sync';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';

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
  | {
      type: 'upsert';
      bookingId: string;
      orgId: string;
      action?: 'assignment' | 'schedule_change' | 'reassignment' | 'retry' | 'intake' | 'repair';
      correlationId?: string;
      idempotencyKey?: string;
    }
  | {
      type: 'delete';
      bookingId: string;
      sitterId: string;
      orgId: string;
      action?: 'cancellation' | 'reassignment' | 'retry' | 'repair';
      correlationId?: string;
      idempotencyKey?: string;
    }
  | {
      type: 'syncRange';
      sitterId: string;
      start: string;
      end: string;
      orgId: string;
      correlationId?: string;
      idempotencyKey?: string;
    };

export async function enqueueCalendarSync(job: CalendarJobType): Promise<string | null> {
  const correlationId = job.correlationId || randomUUID();
  const idempotencyKey =
    job.idempotencyKey ||
    (job.type === 'upsert'
      ? `${job.orgId}:upsert:${job.bookingId}:${job.action || 'assignment'}`
      : job.type === 'delete'
        ? `${job.orgId}:delete:${job.bookingId}:${job.sitterId}:${job.action || 'cancellation'}`
        : `${job.orgId}:syncRange:${job.sitterId}:${job.start}:${job.end}`);
  const payload = { ...job, correlationId, idempotencyKey };
  const j = await calendarQueue.add(`calendar:${job.type}`, payload, {
    jobId: `calendar:${idempotencyKey}`,
    attempts: 4,
    removeOnComplete: 200,
    removeOnFail: 200,
  });
  return j?.id ?? null;
}

function createCalendarWorker(): Worker {
  return new Worker(
    'calendar-sync',
    async (job) => {
      const data = job.data as CalendarJobType;
      const db = getScopedDb({ orgId: data.orgId });

      if (data.type === 'upsert') {
        const result = await upsertEventForBooking(db, data.bookingId, data.orgId, {
          correlationId: data.correlationId,
          idempotencyKey: data.idempotencyKey,
          action: data.action,
        });
        await logEvent({
          orgId: data.orgId,
          actorUserId: 'system',
          action: 'calendar.sync.succeeded',
          entityType: 'calendar',
          entityId: data.bookingId,
          metadata: {
            bookingId: data.bookingId,
            action: result.action,
            correlationId: data.correlationId,
            idempotencyKey: data.idempotencyKey,
            ...(result.error && { error: result.error }),
          },
        });
        return result;
      }

      if (data.type === 'delete') {
        const result = await deleteEventForBooking(db, data.bookingId, data.sitterId, data.orgId, {
          correlationId: data.correlationId,
          idempotencyKey: data.idempotencyKey,
          action: data.action,
        });
        await logEvent({
          orgId: data.orgId,
          actorUserId: 'system',
          action: result.deleted ? 'calendar.sync.succeeded' : 'calendar.sync.failed',
          entityType: 'calendar',
          entityId: data.bookingId,
          metadata: {
            bookingId: data.bookingId,
            sitterId: data.sitterId,
            deleted: result.deleted,
            error: result.error,
            correlationId: data.correlationId,
            idempotencyKey: data.idempotencyKey,
          },
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
          metadata: { sitterId: data.sitterId, correlationId: data.correlationId, idempotencyKey: data.idempotencyKey, ...result },
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
        metadata: {
          error: (err as Error).message,
          jobData: data,
          attempts,
          correlationId: (data as any)?.correlationId ?? null,
          idempotencyKey: (data as any)?.idempotencyKey ?? null,
        },
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
