import { Controller, Get, Post, Param, Query, Body, UseGuards, Res, Header } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Response } from 'express';

@Controller('api/policy')
@UseGuards(AuthGuard)
export class PolicyController {
  constructor(private policyService: PolicyService) {}

  @Get('violations')
  async getViolations(
    @CurrentUser() user: any,
    @Query() query: {
      status?: string;
      threadId?: string;
      violationType?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.policyService.getViolations(user.orgId, query);
  }

  @Get('violations/:id')
  async getViolation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.policyService.getViolation(user.orgId, id);
  }

  @Post('violations/:id/resolve')
  async resolveViolation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.policyService.resolveViolation(user.orgId, id, user.id);
  }

  @Post('violations/:id/dismiss')
  async dismissViolation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.policyService.dismissViolation(user.orgId, id, user.id);
  }

  @Post('violations/:id/override')
  async overrideViolation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.policyService.overrideViolation(user.orgId, id, user.id, body.reason);
  }

  @Get('violations/export.csv')
  @Header('Content-Type', 'text/csv')
  async exportViolations(
    @CurrentUser() user: any,
    @Query() query: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    @Res() res: Response,
  ) {
    const csv = await this.policyService.exportViolations(user.orgId, query);
    res.send(csv);
  }
}
