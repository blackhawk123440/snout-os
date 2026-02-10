import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Proof Worker
 * 
 * Processes proof jobs to demonstrate worker execution.
 * Writes audit events to prove the worker is alive and processing jobs.
 */
@Injectable()
export class ProofWorker implements OnModuleInit {
  private readonly logger = new Logger(ProofWorker.name);
  private worker: Worker;
  private queue: Queue;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
    this.queue = new Queue('proof', { connection });
  }

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'proof',
      async (job) => {
        this.logger.log(`Processing proof job ${job.id}`);
        
        const { orgId, jobId } = job.data;
        
        // Write audit event to prove worker executed
        await this.audit.recordEvent({
          orgId,
          actorType: 'system',
          eventType: 'ops.proof.job.processed',
          correlationIds: {
            jobId: String(jobId),
            bullmqJobId: String(job.id),
          },
          payload: {
            jobId,
            bullmqJobId: String(job.id),
            processedAt: new Date().toISOString(),
            timestamp: Date.now(),
          },
        });

        this.logger.log(`Proof job ${job.id} processed successfully`);
        return { success: true, jobId, processedAt: new Date().toISOString() };
      },
      {
        connection,
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Proof job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Proof job ${job?.id} failed:`, err);
    });

    this.logger.log('Proof worker started');
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
  }
}
