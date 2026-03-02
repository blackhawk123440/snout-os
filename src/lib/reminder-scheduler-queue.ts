/**
 * Reminder Scheduler Queue
 * Queue-driven, org-scoped reminder scheduling. No global setInterval scanning.
 *
 * Flow:
 * 1. Repeatable "reminder-dispatcher" runs every 15 min
 * 2. Dispatcher gets all orgs, enqueues "reminder-tick:{orgId}" for each
 * 3. Worker processes tick jobs: uses getScopedDb, finds tomorrow's bookings, enqueues nightBeforeReminder
 * 4. Idempotency: jobId on automation jobs prevents duplicates
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/db";
import { getScopedDb } from "@/lib/tenancy";
import { enqueueAutomation } from "@/lib/automation-queue";
import { logEventFromLogger } from "@/lib/event-logger";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

export const reminderSchedulerQueue = new Queue("reminder-scheduler", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

export interface ReminderTickJobData {
  orgId: string;
}

/**
 * Process reminders for a single org. Uses getScopedDb for tenant safety.
 */
export async function processRemindersForOrg(orgId: string): Promise<{ processed: number }> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const db = getScopedDb({ orgId });

  const tomorrowBookings = await db.booking.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      startAt: { gte: tomorrow, lt: dayAfter },
    },
    include: { pets: true, timeSlots: true, sitter: true, client: true },
  });

  // Skip bookings with deleted client or sitter
  const activeBookings = tomorrowBookings.filter(
    (b) => !(b.client?.deletedAt || b.sitter?.deletedAt)
  );

  let processed = 0;
  const dateKey = tomorrow.toISOString().slice(0, 10);

  for (const booking of activeBookings) {
    try {
      const clientKey = `nightBeforeReminder:client:${booking.id}:${dateKey}`;
      const sitterKey = `nightBeforeReminder:sitter:${booking.id}:${dateKey}`;

      await enqueueAutomation(
        "nightBeforeReminder",
        "client",
        {
          orgId,
          bookingId: booking.id,
          firstName: booking.firstName,
          lastName: booking.lastName,
          phone: booking.phone,
          service: booking.service,
        },
        clientKey
      );

      await logEventFromLogger("reminder.scheduled", "success", {
        orgId,
        bookingId: booking.id,
        metadata: { recipient: "client", dateKey },
      });

      if (booking.sitterId) {
        await enqueueAutomation(
          "nightBeforeReminder",
          "sitter",
          {
            orgId,
            bookingId: booking.id,
            sitterId: booking.sitterId,
            firstName: booking.firstName,
            lastName: booking.lastName,
            service: booking.service,
          },
          sitterKey
        );

        await logEventFromLogger("reminder.scheduled", "success", {
          orgId,
          bookingId: booking.id,
          metadata: { recipient: "sitter", dateKey },
        });
      }

      processed++;
    } catch (err) {
      console.error(`[ReminderScheduler] Failed to enqueue for booking ${booking.id}:`, err);
      await logEventFromLogger("reminder.scheduled", "failed", {
        orgId,
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { processed };
}

/**
 * Dispatcher: get all orgs and enqueue per-org tick jobs.
 */
export async function runReminderDispatcher(): Promise<{ orgsProcessed: number }> {
  const orgs = await (prisma as any).org.findMany({
    select: { id: true },
  });

  for (const org of orgs) {
    await reminderSchedulerQueue.add(
      "reminder-tick",
      { orgId: org.id } as ReminderTickJobData,
      {
        jobId: `reminder-tick:${org.id}:${Date.now()}`,
      }
    );
  }

  return { orgsProcessed: orgs.length };
}

/**
 * Create worker for reminder scheduler.
 */
export function createReminderSchedulerWorker(): Worker {
  return new Worker(
    "reminder-scheduler",
    async (job) => {
      const { name, data } = job;

      if (name === "reminder-dispatcher") {
        return await runReminderDispatcher();
      }

      if (name === "reminder-tick") {
        const { orgId } = data as ReminderTickJobData;
        if (!orgId) throw new Error("orgId required for reminder-tick");
        return await processRemindersForOrg(orgId);
      }

      throw new Error(`Unknown job name: ${name}`);
    },
    { connection, concurrency: 3 }
  );
}

let reminderSchedulerWorker: Worker | null = null;

export function initializeReminderSchedulerWorker(): Worker {
  if (!reminderSchedulerWorker) {
    reminderSchedulerWorker = createReminderSchedulerWorker();
    reminderSchedulerWorker.on("completed", (job) => {
      if (process.env.NODE_ENV !== "test") {
        console.log(`[ReminderScheduler] Job ${job.id} completed`);
      }
    });
    reminderSchedulerWorker.on("failed", (job, err) => {
      console.error(`[ReminderScheduler] Job ${job?.id} failed:`, err);
    });
  }
  return reminderSchedulerWorker;
}

const REMINDER_DISPATCHER_CRON = "*/15 * * * *"; // Every 15 minutes

/**
 * Schedule the repeatable dispatcher job (every 15 min).
 * Removes existing repeatable to avoid duplicates on restart.
 */
export async function scheduleReminderDispatcher(): Promise<void> {
  const repeatableJobs = await reminderSchedulerQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === "reminder-dispatcher") {
      await reminderSchedulerQueue.removeRepeatableByKey(job.key);
    }
  }

  await reminderSchedulerQueue.add(
    "reminder-dispatcher",
    {},
    {
      repeat: { pattern: REMINDER_DISPATCHER_CRON },
      removeOnComplete: 10,
    }
  );
}
