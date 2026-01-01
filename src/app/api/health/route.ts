import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { checkRedisConnection, checkQueueConnection, getWorkerStatus } from "@/lib/health-checks";

/**
 * Health check endpoint
 * 
 * Master Spec Reference: Section 9.1
 * 
 * Returns status of critical services:
 * - 9.1.1 DB connected
 * - 9.1.2 Redis connected
 * - 9.1.3 Queue connected
 * - 9.1.4 Worker heartbeat and last processed job timestamp
 * - 9.1.5 Webhook signature validation status
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
      queue: "unknown",
      workers: "unknown",
      openphone: "unknown",
    },
    workers: {
      hasWorkers: false,
      lastJobProcessed: undefined as string | undefined,
      queues: {
        automation: { waiting: 0, active: 0, completed: 0, failed: 0 },
        reminders: { waiting: 0, active: 0, completed: 0, failed: 0 },
        summary: { waiting: 0, active: 0, completed: 0, failed: 0 },
        reconciliation: { waiting: 0, active: 0, completed: 0, failed: 0 },
      },
    },
    // Gate B Phase 1: Include auth configuration status
    auth: {
      configured: !!env.NEXTAUTH_SECRET,
      flags: {
        enableAuthProtection: env.ENABLE_AUTH_PROTECTION === true,
        enableSitterAuth: env.ENABLE_SITTER_AUTH === true,
        enablePermissionChecks: env.ENABLE_PERMISSION_CHECKS === true,
        enableWebhookValidation: env.ENABLE_WEBHOOK_VALIDATION === true,
      },
    },
  } as {
    status: string;
    timestamp: string;
    services: {
      database: string;
      redis: string;
      queue: string;
      workers: string;
      openphone: string;
    };
    workers: {
      hasWorkers: boolean;
      lastJobProcessed?: string;
      queues: {
        automation: { waiting: number; active: number; completed: number; failed: number };
        reminders: { waiting: number; active: number; completed: number; failed: number };
        summary: { waiting: number; active: number; completed: number; failed: number };
        reconciliation: { waiting: number; active: number; completed: number; failed: number };
      };
    };
    auth: {
      configured: boolean;
      flags: {
        enableAuthProtection: boolean;
        enableSitterAuth: boolean;
        enablePermissionChecks: boolean;
        enableWebhookValidation: boolean;
      };
    };
  };

  // 9.1.1: Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "ok";
  } catch (error) {
    health.services.database = "error";
    health.status = "degraded";
  }

  // 9.1.2: Check Redis connection
  const redisCheck = await checkRedisConnection();
  if (redisCheck.connected) {
    health.services.redis = "ok";
  } else {
    health.services.redis = "error";
    health.status = "degraded";
  }

  // 9.1.3: Check queue connection
  const queueCheck = await checkQueueConnection();
  if (queueCheck.connected) {
    health.services.queue = "ok";
  } else {
    health.services.queue = "error";
    health.status = "degraded";
  }

  // 9.1.4: Get worker heartbeat and last processed job timestamp
  if (queueCheck.connected) {
    try {
      const workerStatus = await getWorkerStatus();
      health.workers = workerStatus;
      if (workerStatus.hasWorkers) {
        health.services.workers = "ok";
      } else {
        health.services.workers = "warning";
        if (health.status === "ok") {
          health.status = "degraded";
        }
      }
    } catch (error) {
      health.services.workers = "error";
      health.status = "degraded";
    }
  } else {
    health.services.workers = "error";
    health.status = "degraded";
  }

  // Check OpenPhone API key (not in spec but useful)
  if (process.env.OPENPHONE_API_KEY) {
    health.services.openphone = "configured";
  } else {
    health.services.openphone = "not_configured";
    // Don't degrade for missing OpenPhone if not critical
  }

  // 9.1.5: Webhook signature validation status is already included in auth.flags.enableWebhookValidation

  const statusCode = health.status === "ok" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}


