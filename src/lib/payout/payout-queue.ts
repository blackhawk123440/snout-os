/**
 * Payout queue: enqueue payout job on booking completion.
 * Idempotent via jobId = payout:{bookingId}
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/db";
import { getScopedDb } from "@/lib/tenancy";
import { calculatePayoutForBooking, executePayout } from "./payout-engine";
import { persistPayrollRunFromTransfer } from "@/lib/payroll/payroll-service";
import { logEvent } from "@/lib/log-event";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

export const payoutQueue = new Queue("payouts", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const JOB_PREFIX = "payout";

export function getPayoutJobId(bookingId: string): string {
  return `${JOB_PREFIX}:${bookingId}`;
}

export async function enqueuePayoutForBooking(params: {
  orgId: string;
  bookingId: string;
  sitterId: string;
}): Promise<void> {
  const { orgId, bookingId, sitterId } = params;
  const jobId = getPayoutJobId(bookingId);

  const existing = await payoutQueue.getJob(jobId);
  if (existing && !["failed", "completed"].includes(await existing.getState())) {
    return;
  }

  await payoutQueue.add(
    "process-payout",
    { orgId, bookingId, sitterId },
    { jobId }
  );

  await logEvent({
    action: "payout.scheduled",
    orgId,
    metadata: { bookingId, sitterId },
  }).catch(() => {});
}

export function initializePayoutWorker(): Worker {
  return new Worker(
    "payouts",
    async (job) => {
      const { orgId, bookingId, sitterId } = job.data;

      const db = getScopedDb({ orgId });
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { sitter: true },
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }
      if (booking.sitterId !== sitterId) {
        return;
      }
      if (booking.status !== "completed") {
        return;
      }
      if (booking.sitter?.deletedAt) {
        return; // Skip payout for deleted sitters
      }

      const totalPrice = Number(booking.totalPrice) || 0;
      if (totalPrice <= 0) return;

      const commissionPct = booking.sitter?.commissionPercentage ?? 80;
      const calc = calculatePayoutForBooking(totalPrice, commissionPct);
      if (calc.amountCents <= 0) return;

      const result = await executePayout({
        db: db as any,
        orgId,
        sitterId,
        bookingId,
        amountCents: calc.amountCents,
        currency: "usd",
      });

      if (!result.success) {
        throw new Error(result.error || "Payout failed");
      }

      if (result.payoutTransferId) {
        const commissionAmount = totalPrice - calc.netAmount;
        await persistPayrollRunFromTransfer(
          db as any,
          orgId,
          result.payoutTransferId,
          sitterId,
          totalPrice,
          commissionAmount,
          calc.netAmount
        ).catch((e) => console.error("[PayoutWorker] persistPayrollRunFromTransfer failed:", e));
      }
    },
    { connection }
  );
}
