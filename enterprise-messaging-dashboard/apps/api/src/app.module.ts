import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ProviderModule } from './provider/provider.module';
import { NumbersModule } from './numbers/numbers.module';
import { ThreadsModule } from './threads/threads.module';
import { MessagingModule } from './messaging/messaging.module';
import { RoutingModule } from './routing/routing.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { PolicyModule } from './policy/policy.module';
import { AutomationsModule } from './automations/automations.module';
import { AlertsModule } from './alerts/alerts.module';
import { SetupModule } from './setup/setup.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WorkersModule } from './workers/workers.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SitterModule } from './sitter/sitter.module';
import { OpsModule } from './ops/ops.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 10, // 10 requests per minute (for sensitive endpoints)
      },
    ]),
    PrismaModule,
    AuthModule,
    AuditModule,
    ProviderModule,
    NumbersModule,
    ThreadsModule,
    MessagingModule,
    RoutingModule,
    AssignmentsModule,
    PolicyModule,
    AutomationsModule,
    AlertsModule,
    SetupModule,
    WebhooksModule,
    WorkersModule,
    DeliveriesModule,
    AnalyticsModule,
    SitterModule,
    OpsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
