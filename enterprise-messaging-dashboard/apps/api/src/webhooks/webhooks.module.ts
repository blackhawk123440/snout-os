import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { RoutingModule } from '../routing/routing.module';
import { PolicyModule } from '../policy/policy.module';
import { SrsModule } from '../srs/srs.module';

@Module({
  imports: [RoutingModule, PolicyModule, SrsModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}
