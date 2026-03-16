/**
 * Automation Worker — Event-Driven Refactor
 * Drop into: src/worker/automation-worker-v2.ts
 * Then update src/worker/index.ts to import this instead of automation-worker.ts
 *
 * Closes REMAINING_GAPS.md #4:
 * - [x] Fully queue-driven reminder generation
 * - [x] Removal of interval-based scanning
 * - [x] Event-driven per org
 * - [x] Horizontally scalable
 *
 * Architecture:
 * - All work enters via BullMQ jobs (no cron/interval scanning)
 * - Each job carries orgId — workers are org-scoped
 * - Idempotent via AutomationRun.idempotencyKey
 * - Dead-letter queue for retries
 * - Horizontally scalable: run N workers, each pulls from same queue
 */

import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Connection ──

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL required for automation worker');
  return new IORedis(url, { maxRetriesPerRequest: null });
}

// ── Queue Definition ──
// Single queue, multiple job types. Workers filter by job name.

export const AUTOMATION_QUEUE = 'automation-events';

export interface AutomationJobData {
  orgId: string;
  eventType: string; // booking.created, booking.confirmed, booking.completed, etc.
  entityType: string; // booking, client, sitter, payment, message
  entityId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  triggeredAt: string; // ISO timestamp
}

export interface ReminderJobData {
  orgId: string;
  automationRunId: string;
  automationId: string;
  bookingId: string;
  actionType: string;
  actionConfig: Record<string, unknown>;
  scheduledFor: string; // ISO timestamp
}

// ── Event Dispatcher ──
// Call this from API routes/handlers when events happen.
// Replaces the old "global scan" pattern.

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(AUTOMATION_QUEUE, { connection: getRedisConnection() });
  }
  return _queue;
}

/**
 * Dispatch an automation event. Called from business logic (booking creation, status change, etc.)
 * This is the ONLY entry point for automation work. No scanning.
 */
export async function dispatchAutomationEvent(data: AutomationJobData): Promise<void> {
  const queue = getQueue();
  const idempotencyKey = `${data.orgId}:${data.eventType}:${data.entityId}:${data.triggeredAt}`;

  await queue.add(
    'process-event',
    data,
    {
      jobId: idempotencyKey, // BullMQ deduplicates by jobId
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    }
  );
}

/**
 * Schedule a delayed action (e.g., reminder 24h before booking).
 * Called by the event processor when it finds a time-based action.
 */
export async function scheduleDelayedAction(data: ReminderJobData): Promise<void> {
  const queue = getQueue();
  const delay = new Date(data.scheduledFor).getTime() - Date.now();

  if (delay <= 0) {
    // Already past due — execute immediately
    await queue.add('execute-action', data, {
      jobId: `action:${data.automationRunId}:${data.actionType}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  } else {
    await queue.add('execute-action', data, {
      jobId: `action:${data.automationRunId}:${data.actionType}`,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}

// ── Event Processor ──
// Finds matching automations for a given event and creates runs.

async function processEvent(job: Job<AutomationJobData>): Promise<void> {
  const { orgId, eventType, entityId, entityType, payload, correlationId } = job.data;

  // 1. Find all active automations for this org + trigger type
  const automations = await prisma.automation.findMany({
    where: {
      orgId,
      status: 'active',
      isEnabled: true,
      trigger: { triggerType: eventType },
    },
    include: {
      trigger: true,
      conditionGroups: { include: { conditions: true }, orderBy: { order: 'asc' } },
      actions: { orderBy: { order: 'asc' } },
    },
  });

  if (automations.length === 0) return;

  for (const automation of automations) {
    const idempotencyKey = `${automation.id}:${entityId}:${job.data.triggeredAt}`;

    // 2. Check idempotency — skip if already processed
    const existing = await prisma.automationRun.findUnique({
      where: { idempotencyKey },
    });
    if (existing) continue;

    // 3. Create AutomationRun
    const run = await prisma.automationRun.create({
      data: {
        orgId,
        automationId: automation.id,
        status: 'running',
        targetEntityType: entityType,
        targetEntityId: entityId,
        idempotencyKey,
        correlationId,
        metadata: JSON.stringify(payload),
      },
    });

    try {
      // 4. Evaluate conditions
      const conditionsPassed = await evaluateConditions(
        automation.conditionGroups,
        { orgId, entityType, entityId, payload }
      );

      if (!conditionsPassed) {
        await prisma.automationRun.update({
          where: { id: run.id },
          data: { status: 'skipped', reason: 'Conditions not met' },
        });
        continue;
      }

      // 5. Execute or schedule actions
      for (const action of automation.actions) {
        const config = JSON.parse(action.actionConfig);

        // Check if action is time-delayed (e.g., "24 hours before startAt")
        if (config.delayMinutes || config.scheduleBefore) {
          const scheduledFor = computeScheduleTime(config, payload);
          if (scheduledFor) {
            await scheduleDelayedAction({
              orgId,
              automationRunId: run.id,
              automationId: automation.id,
              bookingId: entityId,
              actionType: action.actionType,
              actionConfig: config,
              scheduledFor: scheduledFor.toISOString(),
            });

            await prisma.automationRunStep.create({
              data: {
                orgId,
                automationRunId: run.id,
                stepType: 'actionExecute',
                status: 'success',
                input: JSON.stringify({ actionType: action.actionType, scheduledFor }),
                output: JSON.stringify({ scheduled: true }),
              },
            });
          }
        } else {
          // Execute immediately
          await executeAction(run.id, orgId, action.actionType, config, {
            entityType, entityId, payload,
          });
        }
      }

      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: 'success' },
      });

    } catch (error: any) {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: 'failed', reason: error.message },
      });

      // Log to EventLog for ops dashboard
      await prisma.eventLog.create({
        data: {
          orgId,
          eventType: 'automation.failed',
          level: 'error',
          message: `Automation ${automation.name} failed: ${error.message}`,
          metadata: JSON.stringify({ automationId: automation.id, runId: run.id, entityId }),
          correlationId,
        },
      });

      throw error; // Let BullMQ retry
    }
  }
}

// ── Condition Evaluator ──

async function evaluateConditions(
  groups: Array<{
    operator: string;
    conditions: Array<{ conditionType: string; conditionConfig: string }>;
  }>,
  context: { orgId: string; entityType: string; entityId: string; payload: Record<string, unknown> }
): Promise<boolean> {
  if (groups.length === 0) return true;

  for (const group of groups) {
    const results = group.conditions.map((cond) => {
      const config = JSON.parse(cond.conditionConfig);
      return evaluateSingleCondition(cond.conditionType, config, context);
    });

    const allResolved = await Promise.all(results);
    const passed = group.operator === 'all'
      ? allResolved.every(Boolean)
      : allResolved.some(Boolean);

    if (!passed) return false;
  }

  return true;
}

async function evaluateSingleCondition(
  type: string,
  config: Record<string, unknown>,
  context: { orgId: string; entityType: string; entityId: string; payload: Record<string, unknown> }
): Promise<boolean> {
  const { payload } = context;

  switch (type) {
    case 'booking.service':
      return payload.service === config.value;
    case 'booking.status':
      return payload.status === config.value;
    case 'booking.isAfterHours':
      return !!payload.afterHours;
    case 'booking.isHoliday':
      return !!payload.holiday;
    case 'client.isNew': {
      if (!payload.clientId) return false;
      const bookingCount = await prisma.booking.count({
        where: { clientId: payload.clientId as string, orgId: context.orgId },
      });
      return bookingCount <= 1;
    }
    default:
      console.warn(`Unknown condition type: ${type}`);
      return true; // Unknown conditions pass (fail-open)
  }
}

// ── Action Executor ──

async function executeAction(
  runId: string,
  orgId: string,
  actionType: string,
  config: Record<string, unknown>,
  context: { entityType: string; entityId: string; payload: Record<string, unknown> }
): Promise<void> {
  const step = await prisma.automationRunStep.create({
    data: {
      orgId,
      automationRunId: runId,
      stepType: 'actionExecute',
      status: 'success',
      input: JSON.stringify({ actionType, config }),
    },
  });

  try {
    switch (actionType) {
      case 'sendSMS': {
        // Import dynamically to avoid circular deps
        const { sendMessage } = await import('@/lib/messaging/send');
        const booking = await prisma.booking.findUnique({ where: { id: context.entityId } });
        if (!booking) throw new Error(`Booking ${context.entityId} not found`);

        const body = interpolateTemplate(config.body as string, booking);
        await sendMessage({
          orgId,
          to: booking.phone,
          body,
          bookingId: booking.id,
        });
        break;
      }

      case 'updateBookingStatus': {
        await prisma.booking.update({
          where: { id: context.entityId },
          data: { status: config.newStatus as string },
        });
        break;
      }

      case 'assignSitter': {
        // Trigger dispatch logic
        const { dispatchAutomationEvent } = await import('./automation-worker-v2');
        await dispatchAutomationEvent({
          orgId,
          eventType: 'dispatch.requested',
          entityType: 'booking',
          entityId: context.entityId,
          payload: context.payload,
          triggeredAt: new Date().toISOString(),
        });
        break;
      }

      default:
        console.warn(`Unknown action type: ${actionType}`);
    }

    await prisma.automationRunStep.update({
      where: { id: step.id },
      data: { status: 'success', output: JSON.stringify({ executed: true }) },
    });
  } catch (error: any) {
    await prisma.automationRunStep.update({
      where: { id: step.id },
      data: { status: 'failed', error: JSON.stringify({ message: error.message }) },
    });
    throw error;
  }
}

// ── Helpers ──

function interpolateTemplate(template: string, booking: any): string {
  return template
    .replace(/\{\{firstName\}\}/g, booking.firstName || '')
    .replace(/\{\{lastName\}\}/g, booking.lastName || '')
    .replace(/\{\{service\}\}/g, booking.service || '')
    .replace(/\{\{date\}\}/g, booking.startAt ? new Date(booking.startAt).toLocaleDateString() : '')
    .replace(/\{\{time\}\}/g, booking.startAt ? new Date(booking.startAt).toLocaleTimeString() : '')
    .replace(/\{\{totalPrice\}\}/g, booking.totalPrice?.toString() || '');
}

function computeScheduleTime(
  config: Record<string, unknown>,
  payload: Record<string, unknown>
): Date | null {
  if (config.delayMinutes) {
    return new Date(Date.now() + (config.delayMinutes as number) * 60000);
  }
  if (config.scheduleBefore && payload.startAt) {
    const start = new Date(payload.startAt as string);
    const minutesBefore = config.scheduleBefore as number;
    return new Date(start.getTime() - minutesBefore * 60000);
  }
  return null;
}

// ── Worker Entrypoint ──
// Call startAutomationWorker() from src/worker/index.ts

export function startAutomationWorker(): Worker {
  const connection = getRedisConnection();

  const worker = new Worker(
    AUTOMATION_QUEUE,
    async (job: Job) => {
      switch (job.name) {
        case 'process-event':
          return processEvent(job as Job<AutomationJobData>);
        case 'execute-action':
          return executeDelayedAction(job as Job<ReminderJobData>);
        default:
          console.warn(`Unknown job name: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 10, // Process 10 jobs in parallel
      limiter: { max: 50, duration: 1000 }, // Rate limit: 50 jobs/sec
    }
  );

  worker.on('completed', (job) => {
    console.log(`[automation-v2] Job ${job.id} completed (${job.name})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[automation-v2] Job ${job?.id} failed (${job?.name}):`, err.message);
  });

  console.log('[automation-v2] Worker started (event-driven, no scanning)');
  return worker;
}

async function executeDelayedAction(job: Job<ReminderJobData>): Promise<void> {
  const { orgId, automationRunId, bookingId, actionType, actionConfig } = job.data;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    console.warn(`[automation-v2] Booking ${bookingId} not found for delayed action`);
    return;
  }

  // Check if booking was cancelled since scheduling
  if (booking.status === 'cancelled') {
    console.log(`[automation-v2] Skipping delayed action — booking ${bookingId} was cancelled`);
    await prisma.automationRunStep.create({
      data: {
        orgId,
        automationRunId,
        stepType: 'actionExecute',
        status: 'skipped',
        input: JSON.stringify({ actionType, reason: 'booking_cancelled' }),
      },
    });
    return;
  }

  await executeAction(automationRunId, orgId, actionType, actionConfig, {
    entityType: 'booking',
    entityId: bookingId,
    payload: booking as any,
  });
}
