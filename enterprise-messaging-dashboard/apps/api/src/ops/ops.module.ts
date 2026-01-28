import { Module } from '@nestjs/common';
import { OpsService } from './ops.service';
import { OpsController } from './ops.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [PrismaModule, AuditModule, WorkersModule],
  providers: [OpsService],
  controllers: [OpsController],
  exports: [OpsService],
})
export class OpsModule {}
