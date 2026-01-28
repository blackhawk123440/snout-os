import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OpsService } from './ops.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { z } from 'zod';

const replayJobSchema = z.object({
  reason: z.string().optional(),
});

const ignoreJobSchema = z.object({
  reason: z.string().optional(),
});

@Controller('api/ops')
@UseGuards(AuthGuard)
export class OpsController {
  constructor(private opsService: OpsService) {}

  @Get('dlq')
  async getDLQJobs(@CurrentUser() user: any) {
    // Owner-only
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can access DLQ');
    }

    return this.opsService.getDLQJobs(user.orgId);
  }

  @Post('dlq/:queueName/:jobId/replay')
  async replayDLQJob(
    @CurrentUser() user: any,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() body: unknown,
  ) {
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can replay DLQ jobs');
    }

    if (queueName !== 'message-retry' && queueName !== 'automation') {
      throw new ForbiddenException('Invalid queue name');
    }

    const params = replayJobSchema.parse(body);
    return this.opsService.replayDLQJob(user.orgId, queueName, jobId, user.id, params.reason);
  }

  @Post('dlq/:queueName/:jobId/ignore')
  async ignoreDLQJob(
    @CurrentUser() user: any,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Body() body: unknown,
  ) {
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can ignore DLQ jobs');
    }

    if (queueName !== 'message-retry' && queueName !== 'automation') {
      throw new ForbiddenException('Invalid queue name');
    }

    const params = ignoreJobSchema.parse(body);
    return this.opsService.ignoreDLQJob(user.orgId, queueName, jobId, user.id, params.reason);
  }

  @Get('health')
  async getHealth(@CurrentUser() user: any) {
    // Owner-only
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only owners can access health checks');
    }

    return this.opsService.getHealth(user.orgId);
  }
}
