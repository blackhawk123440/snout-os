import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('response-times')
  async getResponseTimes(
    @CurrentUser() user: any,
    @Query() query: {
      startDate: string;
      endDate: string;
      groupBy: 'thread' | 'sitter';
    },
  ) {
    return this.analyticsService.getResponseTimes(user.orgId, {
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      groupBy: query.groupBy || 'thread',
    });
  }

  @Get('message-volume')
  async getMessageVolume(
    @CurrentUser() user: any,
    @Query() query: {
      startDate: string;
      endDate: string;
      groupBy: 'day' | 'class';
    },
  ) {
    return this.analyticsService.getMessageVolume(user.orgId, {
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      groupBy: query.groupBy || 'day',
    });
  }
}
