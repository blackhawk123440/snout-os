import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { RoutingModule } from '../routing/routing.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [RoutingModule, PolicyModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}
