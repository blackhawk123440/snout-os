import { Module, forwardRef } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { RoutingModule } from '../routing/routing.module';
import { PolicyModule } from '../policy/policy.module';
import { WorkersModule } from '../workers/workers.module';
import { ThreadsModule } from '../threads/threads.module';
import { SrsModule } from '../srs/srs.module';

@Module({
  imports: [RoutingModule, PolicyModule, forwardRef(() => WorkersModule), ThreadsModule, SrsModule],
  providers: [MessagingService],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
