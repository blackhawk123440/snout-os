import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Ops Service
 * 
 * Handles operational tooling:
 * - DLQ (Dead Letter Queue) viewer and replay
 * - Health checks
 */
@Injectable()
export class OpsService {
  private messageRetryQueue: Queue;
  private automationQueue: Queue;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    @Inject('MESSAGE_RETRY_QUEUE') messageRetryQueue: Queue,
    @Inject('AUTOMATION_QUEUE') automationQueue: Queue,
  ) {
    this.messageRetryQueue = messageRetryQueue;
    this.automationQueue = automationQueue;
  }

  /**
   * Get DLQ jobs (failed jobs from BullMQ)
   */
  async getDLQJobs(orgId: string) {
    try {
      // Get failed jobs from both queues
      const [messageRetryFailed, automationFailed] = await Promise.all([
        this.messageRetryQueue.getFailed(0, 100).catch(() => []),
        this.automationQueue.getFailed(0, 100).catch(() => []),
      ]);

      // Filter by orgId and format
      const allFailed = [
        ...messageRetryFailed.map((job) => ({
          id: String(job.id),
          queue: 'message-retry',
          name: job.name,
          data: job.data,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          timestamp: job.timestamp || Date.now(),
          processedOn: job.processedOn || null,
          finishedOn: job.finishedOn || null,
          orgId: job.data?.orgId,
          entityType: 'message',
          entityId: job.data?.messageId,
        })),
        ...automationFailed.map((job) => ({
          id: String(job.id),
          queue: 'automation',
          name: job.name,
          data: job.data,
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          timestamp: job.timestamp || Date.now(),
          processedOn: job.processedOn || null,
          finishedOn: job.finishedOn || null,
          orgId: job.data?.orgId,
          entityType: 'automation',
          entityId: job.data?.automationId,
        })),
      ].filter((job) => job.orgId === orgId);

      // Sort by timestamp (most recent first)
      allFailed.sort((a, b) => b.timestamp - a.timestamp);

      return allFailed;
    } catch (error) {
      // If Redis is not available, return empty array
      return [];
    }
  }

  /**
   * Replay a DLQ job
   */
  async replayDLQJob(orgId: string, queueName: string, jobId: string, userId: string, reason?: string) {
    const queue = queueName === 'message-retry' ? this.messageRetryQueue : this.automationQueue;

    // Get the failed job
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify orgId matches
    if (job.data?.orgId !== orgId) {
      throw new BadRequestException('Job does not belong to organization');
    }

    // Remove from failed state and re-enqueue
    await job.remove();
    await queue.add(job.name, job.data, {
      attempts: (job.opts as any)?.attempts || 3,
      backoff: (job.opts as any)?.backoff || { type: 'exponential', delay: 2000 },
    });

    // Audit event
    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: queueName === 'message-retry' ? 'message' : 'automation',
      entityId: job.data?.messageId || job.data?.automationId,
      eventType: 'ops.dlq_job_replayed',
      payload: { queueName, jobId, reason },
    });

    return { success: true, message: 'Job re-enqueued for retry' };
  }

  /**
   * Ignore (archive) a DLQ job
   */
  async ignoreDLQJob(orgId: string, queueName: string, jobId: string, userId: string, reason?: string) {
    const queue = queueName === 'message-retry' ? this.messageRetryQueue : this.automationQueue;

    // Get the failed job
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify orgId matches
    if (job.data?.orgId !== orgId) {
      throw new BadRequestException('Job does not belong to organization');
    }

    // Remove from failed state (archives it)
    await job.remove();

    // Audit event
    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: queueName === 'message-retry' ? 'message' : 'automation',
      entityId: job.data?.messageId || job.data?.automationId,
      eventType: 'ops.dlq_job_ignored',
      payload: { queueName, jobId, reason },
    });

    return { success: true, message: 'Job archived' };
  }

  /**
   * Get system health status
   */
  async getHealth(orgId: string) {
    try {
      // Provider status (from message numbers - check if any numbers exist)
      const hasNumbers = await this.prisma.messageNumber.findFirst({
        where: { orgId },
        select: { providerType: true },
      });

      // Queue health (with error handling)
      let messageRetryWaiting = 0;
      let messageRetryActive = 0;
      let messageRetryFailed = 0;
      let automationWaiting = 0;
      let automationActive = 0;
      let automationFailed = 0;

      try {
        [messageRetryWaiting, messageRetryActive, messageRetryFailed] = await Promise.all([
          this.messageRetryQueue.getWaitingCount(),
          this.messageRetryQueue.getActiveCount(),
          this.messageRetryQueue.getFailedCount(),
        ]);

        [automationWaiting, automationActive, automationFailed] = await Promise.all([
          this.automationQueue.getWaitingCount(),
          this.automationQueue.getActiveCount(),
          this.automationQueue.getFailedCount(),
        ]);
      } catch (error) {
        // Redis not available
      }

      // Webhook last received (from audit events)
      const lastWebhook = await this.prisma.auditEvent.findFirst({
        where: {
          orgId,
          eventType: { in: ['webhook.inbound.received', 'webhook.status_callback.received'] },
        },
        orderBy: { ts: 'desc' },
        select: { ts: true, eventType: true },
      });

      // DB latency check (simple query)
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;

      return {
        provider: {
          type: hasNumbers?.providerType || 'none',
          connected: !!hasNumbers,
          lastCheck: null, // Would be stored in a health check table
        },
        webhooks: {
          lastReceived: lastWebhook?.ts || null,
          lastEventType: lastWebhook?.eventType || null,
        },
        queues: {
          messageRetry: {
            waiting: messageRetryWaiting,
            active: messageRetryActive,
            failed: messageRetryFailed,
          },
          automation: {
            waiting: automationWaiting,
            active: automationActive,
            failed: automationFailed,
          },
        },
        database: {
          latencyMs: dbLatency,
          status: dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'slow',
        },
      };
    } catch (error) {
      // Return minimal health status on error
      return {
        provider: { type: 'unknown', connected: false, lastCheck: null },
        webhooks: { lastReceived: null, lastEventType: null },
        queues: {
          messageRetry: { waiting: 0, active: 0, failed: 0 },
          automation: { waiting: 0, active: 0, failed: 0 },
        },
        database: { latencyMs: -1, status: 'error' },
      };
    }
  }
}
