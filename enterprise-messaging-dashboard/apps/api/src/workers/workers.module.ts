import { Global, Module, forwardRef } from '@nestjs/common';
import { MessageRetryWorker } from './message-retry.worker';
import { AutomationWorker } from './automation.worker';
import { ProofWorker } from './proof.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ProviderModule } from '../provider/provider.module';
import { AlertsModule } from '../alerts/alerts.module';
import { MessagingModule } from '../messaging/messaging.module';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Global()
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    ProviderModule,
    forwardRef(() => AlertsModule),
    forwardRef(() => MessagingModule),
  ],
  providers: [
    MessageRetryWorker,
    AutomationWorker,
    ProofWorker,
    {
      provide: 'MESSAGE_RETRY_QUEUE',
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const connection = new IORedis(redisUrl);
        return new Queue('message-retry', { connection });
      },
    },
    {
      provide: 'AUTOMATION_QUEUE',
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const connection = new IORedis(redisUrl);
        return new Queue('automation', { connection });
      },
    },
    {
      provide: 'PROOF_QUEUE',
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const connection = new IORedis(redisUrl);
        return new Queue('proof', { connection });
      },
    },
  ],
  exports: [MessageRetryWorker, AutomationWorker, 'MESSAGE_RETRY_QUEUE', 'AUTOMATION_QUEUE', 'PROOF_QUEUE'],
})
export class WorkersModule {}
