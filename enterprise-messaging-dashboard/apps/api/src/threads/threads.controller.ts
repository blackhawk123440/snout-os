import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/threads')
@UseGuards(AuthGuard)
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Get()
  async getThreads(@CurrentUser() user: any, @Query() query: any) {
    return this.threadsService.getThreads(user.orgId, query);
  }

  @Get(':id')
  async getThread(@CurrentUser() user: any, @Param('id') id: string) {
    return this.threadsService.getThread(user.orgId, id);
  }

  @Patch(':id/mark-read')
  async markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.threadsService.markRead(user.orgId, id);
  }
}
