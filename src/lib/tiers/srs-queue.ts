/**
 * SRS Background Jobs Queue
 * 
 * Daily snapshots and weekly evaluations using BullMQ
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { calculateSRS, calculateRolling26WeekScore } from "./srs-engine";
import { checkPromotionEligibility, checkDemotionRequired, checkAtRisk, checkPayRaiseEligibility, getTierPerks } from "./tier-rules";
import { prisma } from "@/lib/db";

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Create SRS queue
export const srsQueue = new Queue("srs", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Daily snapshot job data
 */
export interface DailySnapshotJobData {
  orgId: string;
  sitterId: string;
  asOfDate: string; // ISO date string
}

/**
 * Weekly evaluation job data
 */
export interface WeeklyEvaluationJobData {
  orgId: string;
  sitterId: string;
  asOfDate: string; // ISO date string
}

/**
 * Create daily snapshot for a sitter
 */
async function createDailySnapshot(data: DailySnapshotJobData): Promise<void> {
  const { orgId, sitterId, asOfDate } = data;
  const asOf = new Date(asOfDate);

  // Check if snapshot already exists (idempotent)
  const existing = await (prisma as any).sitterTierSnapshot.findUnique({
    where: {
      orgId_sitterId_asOfDate: {
        orgId,
        sitterId,
        asOfDate: asOf,
      },
    },
  });

  if (existing) {
    console.log(`[SRS] Snapshot already exists for ${sitterId} on ${asOfDate}`);
    return;
  }

  // Calculate SRS
  const srsResult = await calculateSRS(orgId, sitterId, asOf);

  // Calculate rolling 26-week score
  const rolling26w = await calculateRolling26WeekScore(orgId, sitterId, asOf);

  // Get current tier from latest snapshot or default to foundation
  const latestSnapshot = await (prisma as any).sitterTierSnapshot.findFirst({
    where: { orgId, sitterId },
    orderBy: { asOfDate: 'desc' },
  });
  const currentTier = latestSnapshot?.tier || 'foundation';

  // Determine tier recommendation
  const tierRecommendation = srsResult.tierRecommendation;

  // Create snapshot
  const snapshot = await (prisma as any).sitterTierSnapshot.create({
    data: {
      orgId,
      sitterId,
      asOfDate: asOf,
      rolling30dScore: srsResult.score,
      rolling30dBreakdownJson: JSON.stringify(srsResult.breakdown),
      rolling26wScore: rolling26w?.score || null,
      rolling26wBreakdownJson: rolling26w ? JSON.stringify(rolling26w.breakdown) : null,
      tier: currentTier, // Keep current tier, evaluation will update
      provisional: srsResult.provisional,
      visits30d: srsResult.visits30d,
      offers30d: srsResult.offers30d,
      atRisk: false, // Will be set by weekly evaluation
    },
  });

  // Emit audit event
  await (prisma as any).eventLog.create({
    data: {
      eventType: 'sitter.srs.snapshot.created',
      orgId,
      metadata: JSON.stringify({
        sitterId,
        asOfDate: asOfDate,
        score: srsResult.score,
        tier: currentTier,
        provisional: srsResult.provisional,
        snapshotId: snapshot.id,
      }),
      createdAt: new Date(),
    },
  });

  console.log(`[SRS] Created snapshot for ${sitterId}: score=${srsResult.score}, tier=${currentTier}`);
}

/**
 * Weekly evaluation: promotion/demotion/atRisk
 */
async function performWeeklyEvaluation(data: WeeklyEvaluationJobData): Promise<void> {
  const { orgId, sitterId, asOfDate } = data;
  const asOf = new Date(asOfDate);

  // Get latest snapshot
  const latestSnapshot = await (prisma as any).sitterTierSnapshot.findFirst({
    where: { orgId, sitterId },
    orderBy: { asOfDate: 'desc' },
  });

  if (!latestSnapshot) {
    console.log(`[SRS] No snapshot found for ${sitterId}, skipping evaluation`);
    return;
  }

  const currentTier = latestSnapshot.tier as 'foundation' | 'reliant' | 'trusted' | 'preferred';
  const currentScore = latestSnapshot.rolling30dScore;

  // Check for promotion
  const recommendedTier = currentScore >= 90 ? 'preferred' :
                          currentScore >= 80 ? 'trusted' :
                          currentScore >= 70 ? 'reliant' : 'foundation';

  if (recommendedTier !== currentTier && recommendedTier !== 'foundation') {
    const promotionCheck = await checkPromotionEligibility(
      orgId,
      sitterId,
      currentTier,
      recommendedTier,
      asOf
    );

    if (promotionCheck.eligible) {
      // Promote
      await (prisma as any).sitterTierSnapshot.update({
        where: { id: latestSnapshot.id },
        data: {
          tier: recommendedTier,
          lastPromotionAt: asOf,
          atRisk: false,
          atRiskReason: null,
        },
      });

      // Update sitter's current tier
      await (prisma as any).sitter.update({
        where: { id: sitterId },
        data: { currentTierId: null }, // Will need to map to SitterTier table
      });

      // Emit audit event
      await (prisma as any).eventLog.create({
        data: {
          eventType: 'sitter.tier.promoted',
          orgId,
          metadata: JSON.stringify({
            sitterId,
            fromTier: currentTier,
            toTier: recommendedTier,
            score: currentScore,
            asOfDate: asOfDate,
          }),
          createdAt: new Date(),
        },
      });

      console.log(`[SRS] Promoted ${sitterId} from ${currentTier} to ${recommendedTier}`);
    }
  }

  // Check for demotion
  const demotionCheck = await checkDemotionRequired(orgId, sitterId, currentTier, asOf);
  if (demotionCheck.demote && demotionCheck.newTier) {
    // Demote
    await (prisma as any).sitterTierSnapshot.update({
      where: { id: latestSnapshot.id },
      data: {
        tier: demotionCheck.newTier,
        lastDemotionAt: asOf,
        atRisk: false,
        atRiskReason: null,
      },
    });

    // Update sitter's current tier
    await (prisma as any).sitter.update({
      where: { id: sitterId },
      data: { currentTierId: null },
    });

    // Emit audit event
    await (prisma as any).eventLog.create({
      data: {
        eventType: 'sitter.tier.demoted',
        orgId,
        metadata: JSON.stringify({
          sitterId,
          fromTier: currentTier,
          toTier: demotionCheck.newTier,
          reason: demotionCheck.reason,
          score: currentScore,
          asOfDate: asOfDate,
        }),
        createdAt: new Date(),
      },
    });

    console.log(`[SRS] Demoted ${sitterId} from ${currentTier} to ${demotionCheck.newTier}: ${demotionCheck.reason}`);
  }

  // Check at risk status
  const atRiskCheck = await checkAtRisk(orgId, sitterId, currentTier, asOf);
  if (atRiskCheck.atRisk) {
    await (prisma as any).sitterTierSnapshot.update({
      where: { id: latestSnapshot.id },
      data: {
        atRisk: true,
        atRiskReason: atRiskCheck.reason,
      },
    });

    // Emit audit event
    await (prisma as any).eventLog.create({
      data: {
        eventType: 'sitter.tier.at_risk',
        orgId,
        metadata: JSON.stringify({
          sitterId,
          tier: currentTier,
          reason: atRiskCheck.reason,
          score: currentScore,
          asOfDate: asOfDate,
        }),
        createdAt: new Date(),
      },
    });

    console.log(`[SRS] Marked ${sitterId} as at risk: ${atRiskCheck.reason}`);
  }

  // Check pay raise eligibility
  const payRaiseCheck = await checkPayRaiseEligibility(orgId, sitterId, asOf);
  if (payRaiseCheck.eligible && payRaiseCheck.newPay) {
    // Update compensation
    const compensation = await (prisma as any).sitterCompensation.findUnique({
      where: { orgId_sitterId: { orgId, sitterId } },
    });

    if (compensation) {
      const nextReviewDate = new Date(asOf);
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);

      await (prisma as any).sitterCompensation.update({
        where: { id: compensation.id },
        data: {
          basePay: payRaiseCheck.newPay,
          lastRaiseAt: asOf,
          lastRaiseAmount: payRaiseCheck.newPay - compensation.basePay,
          nextReviewDate,
        },
      });

      console.log(`[SRS] Pay raise for ${sitterId}: ${compensation.basePay} -> ${payRaiseCheck.newPay}`);
    }
  }
}

/**
 * Create worker for SRS jobs
 */
export function createSRSWorker(): Worker {
  return new Worker(
    "srs",
    async (job) => {
      const jobType = job.name;
      const data = job.data;

      try {
        if (jobType === "daily-snapshot") {
          await createDailySnapshot(data as DailySnapshotJobData);
        } else if (jobType === "weekly-evaluation") {
          await performWeeklyEvaluation(data as WeeklyEvaluationJobData);
        } else {
          throw new Error(`Unknown job type: ${jobType}`);
        }
      } catch (error: any) {
        console.error(`[SRS Worker] Error processing ${jobType}:`, error);
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );
}

/**
 * Schedule daily snapshot for all sitters in an org
 */
export async function scheduleDailySnapshots(orgId: string, asOfDate: Date = new Date()): Promise<void> {
  // Get all active sitters in org
  const sitters = await (prisma as any).sitter.findMany({
    where: {
      active: true,
      // Note: orgId not on Sitter, need to derive from related entities
      // For now, get from AssignmentWindow or MessageThread
    },
  });

  // Filter to sitters in this org
  const orgSitters = [];
  for (const sitter of sitters) {
    const sitterOrgId = await (prisma as any).assignmentWindow.findFirst({
      where: { sitterId: sitter.id },
      select: { orgId: true },
    });
    if (sitterOrgId?.orgId === orgId) {
      orgSitters.push(sitter);
    }
  }

  // Enqueue snapshot jobs
  for (const sitter of orgSitters) {
    await srsQueue.add(
      "daily-snapshot",
      {
        orgId,
        sitterId: sitter.id,
        asOfDate: asOfDate.toISOString().split('T')[0],
      },
      {
        jobId: `srs-snapshot-${orgId}-${sitter.id}-${asOfDate.toISOString().split('T')[0]}`,
      }
    );
  }
}

/**
 * Schedule weekly evaluation for all sitters in an org
 */
export async function scheduleWeeklyEvaluations(orgId: string, asOfDate: Date = new Date()): Promise<void> {
  // Get all sitters with recent snapshots
  const snapshots = await (prisma as any).sitterTierSnapshot.findMany({
    where: {
      orgId,
      asOfDate: {
        gte: new Date(asOfDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        lte: asOfDate,
      },
    },
    distinct: ['sitterId'],
    select: { sitterId: true },
  });

  // Enqueue evaluation jobs
  for (const snapshot of snapshots) {
    await srsQueue.add(
      "weekly-evaluation",
      {
        orgId,
        sitterId: snapshot.sitterId,
        asOfDate: asOfDate.toISOString().split('T')[0],
      },
      {
        jobId: `srs-eval-${orgId}-${snapshot.sitterId}-${asOfDate.toISOString().split('T')[0]}`,
      }
    );
  }
}
