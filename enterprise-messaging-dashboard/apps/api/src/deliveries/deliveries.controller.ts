import { Controller, Get, Post, Param, Query, UseGuards, Res, Header } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Response } from 'express';

@Controller('api/deliveries')
@UseGuards(AuthGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Get('failures')
  async getFailures(
    @CurrentUser() user: any,
    @Query() query: {
      threadId?: string;
      startDate?: string;
      endDate?: string;
      errorCode?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.deliveriesService.getFailures(user.orgId, query);
  }

  @Post(':id/retry')
  async retryDelivery(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.retryDelivery(user.orgId, id, user.id);
  }

  @Post(':id/resolve')
  async resolveFailure(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.resolveFailure(user.orgId, id, user.id);
  }

  @Get('failures/export.csv')
  @Header('Content-Type', 'text/csv')
  async exportFailures(
    @CurrentUser() user: any,
    @Query() query: {
      startDate?: string;
      endDate?: string;
    },
    @Res() res: Response,
  ) {
    const csv = await this.deliveriesService.exportFailures(user.orgId, query);
    res.send(csv);
  }
}
