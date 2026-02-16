import { Module } from '@nestjs/common';
import { SrsMessageProcessorService } from './srs-message-processor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SrsMessageProcessorService],
  exports: [SrsMessageProcessorService],
})
export class SrsModule {}
