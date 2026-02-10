import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MessagingService } from './messaging.service';
import { ThreadsService } from '../threads/threads.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { sendMessageSchema } from '@snoutos/shared';

@Controller('api/messages')
@UseGuards(AuthGuard)
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private threadsService: ThreadsService,
  ) {}

  @Get('threads')
  async getThreads(@CurrentUser() user: any, @Query() query: any) {
    return this.threadsService.getThreads(user.orgId, query);
  }

  @Get('threads/:threadId')
  async getMessages(@Param('threadId') threadId: string) {
    return this.messagingService.getMessages(threadId);
  }

  @Post('send')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 messages per minute per user
  async sendMessage(@CurrentUser() user: any, @Body() body: unknown) {
    const params = sendMessageSchema.parse(body);
    return this.messagingService.sendMessage({
      orgId: user.orgId,
      threadId: params.threadId,
      body: params.body,
      senderType: user.role === 'owner' ? 'owner' : 'sitter',
      senderId: user.id,
      forceSend: params.forceSend,
    });
  }

  @Post(':messageId/retry')
  async retryMessage(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.retryMessage(messageId, user.orgId);
  }
}
