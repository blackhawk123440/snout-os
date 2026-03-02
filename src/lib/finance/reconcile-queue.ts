/**
 * Finance reconciliation queue: reconcile ledger vs Stripe-persisted tables.
 * Triggered from ops UI.
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { getScopedDb } from "@/lib/tenancy";
import { reconcileOrgRange } from "./reconcile";
import { logEvent } from "@/lib/log-event";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

export const financeReconcileQueue = new Queue("finance.reconcile", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

export interface FinanceReconcileJobData {
  orgId: string;
  start: string; // ISO date
  end: string;   // ISO date
}

export async function enqueueFinanceReconcile(params: {
  orgId: string;
  start: Date;
  end: Date;
}): Promise<string> {
  const job = await financeReconcileQueue.add(
    "reconcile",
    {
      orgId: params.orgId,
      start: params.start.toISOString(),
      end: params.end.toISOString(),
    } as FinanceReconcileJobData
  );
  await logEvent({
    orgId: params.orgId,
    action: "finance.reconcile.requested",
    metadata: { jobId: job.id, start: params.start.toISOString(), end: params.end.toISOString() },
  }).catch(() => {});
  return job.id!;
}

export function initializeFinanceReconcileWorker(): Worker {
  return new Worker(
    "finance.reconcile",
    async (job) => {
      const { orgId, start, end } = job.data as FinanceReconcileJobData;
      const startDate = new Date(start);
      const endDate = new Date(end);

      await logEvent({
        orgId,
        action: "finance.reconcile.started",
        metadata: { jobId: job.id },
      }).catch(() => {});

      try {
        const result = await reconcileOrgRange({ orgId, start: startDate, end: endDate });

        const db = getScopedDb({ orgId });
        await db.reconciliationRun.create({
          data: {
            orgId,
            rangeStart: startDate,
            rangeEnd: endDate,
            status: "succeeded",
            totalsJson: result.totalsByType as object,
            mismatchJson: {
              missingInDb: result.missingInDb,
              missingInStripe: result.missingInStripe,
              amountDiffs: result.amountDiffs,
            } as object,
          },
        });

        await logEvent({
          orgId,
          action: "finance.reconcile.succeeded",
          metadata: {
            jobId: job.id,
            totalsByType: result.totalsByType,
            missingCount: result.missingInDb.length + result.missingInStripe.length,
          },
        }).catch(() => {});

        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const db = getScopedDb({ orgId });
        await db.reconciliationRun.create({
          data: {
            orgId,
            rangeStart: startDate,
            rangeEnd: endDate,
            status: "failed",
            mismatchJson: { error: msg } as object,
          },
        });
        await logEvent({
          orgId,
          action: "finance.reconcile.failed",
          status: "failed",
          metadata: { jobId: job.id, error: msg },
        }).catch(() => {});
        throw err;
      }
    },
    { connection }
  );
}
