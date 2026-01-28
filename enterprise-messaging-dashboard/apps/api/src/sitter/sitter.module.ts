import { Module } from '@nestjs/common';
import { SitterService } from './sitter.service';
import { SitterController } from './sitter.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [PrismaModule, AuditModule, MessagingModule, AssignmentsModule],
  providers: [SitterService],
  controllers: [SitterController],
  exports: [SitterService],
})
export class SitterModule {}
