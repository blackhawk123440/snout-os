import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Inject, forwardRef } from '@nestjs/common';
import type { IProvider } from '../provider/provider.interface';
import { AlertsService } from '../alerts/alerts.service';
import IORedis from 'ioredis';

/**
 * Message Retry Worker - Handles automatic retries with exponential backoff
 * 
 * Retry strategy:
 * - Max 3 automatic attempts
 * - Exponential backoff: 1min, 5min, 15min
 * - After limit: dead-letter queue + alert
 */
@Injectable()
export class MessageRetryWorker implements OnModuleInit {
  private readonly logger = new Logger(MessageRetryWorker.name);
  private queue: Queue;
  private worker: Worker | null = null;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(forwardRef(() => AlertsService))
    private alertsService: AlertsService,
    @Inject('PROVIDER') private provider: IProvider,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const connection = new IORedis(redisUrl);
    this.queue = new Queue('message-retry', { connection });
  }

  async onModuleInit() {
    // Only start worker if Redis is available
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
      });
      
      this.worker = new Worker(
        'message-retry',
        async (job) => {
          return this.processRetry(job.data);
        },
        {
          connection,
          limiter: {
            max: 10,
            duration: 1000,
          },
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Retry job completed: ${job.id}`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Retry job failed: ${job?.id}`, err);
      });
    } catch (error: any) {
      this.logger.warn('Redis not available, retry worker disabled', error?.message);
      // Worker will be null, but app can still run
    }
  }

  /**
   * Queue a message for retry
   */
  async queueRetry(params: {
    messageId: string;
    attemptNo: number;
    delay?: number;
  }) {
    try {
      const delay = params.delay || this.calculateBackoff(params.attemptNo);

      const message = await this.prisma.message.findUnique({
        where: { id: params.messageId },
        select: { orgId: true },
      });

      await this.queue.add(
        'retry-message',
        {
          messageId: params.messageId,
          attemptNo: params.attemptNo,
          orgId: message?.orgId, // Include orgId for filtering
        },
        {
          delay,
          attempts: 1, // Each retry is a separate job
        },
      );
    } catch (error) {
      this.logger.error('Failed to queue retry', error);
    }
  }

  /**
   * Process retry job
   */
  private async processRetry(data: { messageId: string; attemptNo: number }) {
    const { messageId, attemptNo } = data;

    if (attemptNo > 3) {
      // Max retries exceeded - dead letter
      await this.handleDeadLetter(messageId);
      return { status: 'dead_letter' };
    }

    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          thread: {
            include: {
              messageNumber: true,
              client: { include: { contacts: true } },
            },
          },
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      const clientContact = message.thread.client.contacts[0];
      if (!clientContact) {
        throw new Error('Client has no contact number');
      }

      // Retry send
      const sendResult = await this.provider.sendMessage({
        to: clientContact.e164,
        from: message.thread.messageNumber.e164,
        body: message.body,
      });

      // Create delivery record
      await this.prisma.messageDelivery.create({
        data: {
          messageId: message.id,
          attemptNo: attemptNo + 1,
          status: sendResult.success ? 'queued' : 'failed',
          providerErrorCode: sendResult.errorCode || null,
          providerErrorMessage: sendResult.error || null,
          providerRaw: { messageSid: sendResult.messageSid, attemptNo },
        },
      });

      if (!sendResult.success && attemptNo < 3) {
        // Queue next retry
        await this.queueRetry({
          messageId,
          attemptNo: attemptNo + 1,
        });
      }

      await this.audit.recordEvent({
        orgId: message.orgId,
        actorType: 'system',
        entityType: 'message',
        entityId: message.id,
        eventType: 'message.outbound.retry_attempted',
        correlationIds: { messageId },
        payload: { attemptNo, success: sendResult.success },
      });

      return { status: sendResult.success ? 'sent' : 'failed', attemptNo };
    } catch (error: any) {
      this.logger.error(`Retry failed for message ${messageId}`, error);
      throw error;
    }
  }

  /**
   * Handle dead letter (max retries exceeded)
   */
  private async handleDeadLetter(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return;
    }

    // Create alert using AlertsService (handles deduplication)
    await this.alertsService.createAlert({
      orgId: message.orgId,
      severity: 'critical',
      type: 'message.delivery.max_retries_exceeded',
      title: 'Message Delivery Failed - Max Retries Exceeded',
      description: `Message failed after 3 retry attempts. Manual intervention required.`,
      entityType: 'message',
      entityId: message.id,
    });

    await this.audit.recordEvent({
      orgId: message.orgId,
      actorType: 'system',
      entityType: 'message',
      entityId: message.id,
      eventType: 'message.outbound.dead_letter',
      correlationIds: { messageId },
      payload: { reason: 'Max retries exceeded' },
    });
  }

  /**
   * Calculate exponential backoff delay (milliseconds)
   */
  private calculateBackoff(attemptNo: number): number {
    // 1min, 5min, 15min
    const delays = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];
    return delays[Math.min(attemptNo - 1, delays.length - 1)];
  }
}
