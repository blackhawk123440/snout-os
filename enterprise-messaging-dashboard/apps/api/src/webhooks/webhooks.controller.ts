import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('twilio/inbound-sms')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 per minute per IP (allows Twilio retries)
  async handleInboundSms(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);

    return this.webhooksService.handleInboundSms({
      messageSid: body.MessageSid,
      from: body.From,
      to: body.To,
      body: body.Body,
      rawBody,
      signature,
    });
  }

  @Post('twilio/status-callback')
  @Throttle({ default: { limit: 200, ttl: 60000 } }) // 200 per minute (status callbacks are frequent)
  async handleStatusCallback(@Body() body: any) {
    return this.webhooksService.handleStatusCallback({
      messageSid: body.MessageSid,
      status: body.MessageStatus,
      errorCode: body.ErrorCode,
      errorMessage: body.ErrorMessage,
    });
  }
}
