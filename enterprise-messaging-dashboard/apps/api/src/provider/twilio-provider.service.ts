import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';
import type {
  IProvider,
  ProviderConfig,
  SearchNumbersParams,
  AvailableNumber,
  PurchaseNumberResult,
  SendMessageParams,
  SendMessageResult,
  DeliveryStatus,
  WebhookVerificationResult,
} from './provider.interface';

/**
 * Twilio Provider - Production implementation
 * 
 * Wraps Twilio SDK and translates all operations to business language.
 * Errors are translated to human-readable messages.
 */
@Injectable()
export class TwilioProviderService implements IProvider {
  private readonly logger = new Logger(TwilioProviderService.name);
  private client: twilio.Twilio | null = null;
  private config: ProviderConfig = {};

  constructor() {
    // Client will be initialized when configured
  }

  configure(config: ProviderConfig): void {
    this.config = config;

    if (config.accountSid && config.authToken) {
      try {
        this.client = twilio(config.accountSid, config.authToken);
        this.logger.log('Twilio client initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Twilio client', error);
        throw new Error('Unable to connect to Twilio. Check Account SID and Auth Token.');
      }
    }
  }

  async searchNumbers(params: SearchNumbersParams): Promise<AvailableNumber[]> {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }

    try {
      const searchParams: any = {
        limit: params.limit || 10,
      };

      if (params.areaCode) {
        searchParams.areaCode = params.areaCode;
      }

      if (params.country) {
        searchParams.countryCode = params.country;
      } else {
        searchParams.countryCode = 'US';
      }

      const results = await this.client.availablePhoneNumbers('US').local.list(searchParams);

      return results.map((number) => ({
        e164: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region,
        monthlyCostCents: 100, // Twilio charges ~$1/month
      }));
    } catch (error: any) {
      this.logger.error('Failed to search numbers', error);
      throw new Error(
        `Unable to search numbers. ${error.message || 'Check account balance or try different area code.'}`,
      );
    }
  }

  async purchaseNumber(e164: string): Promise<PurchaseNumberResult> {
    if (!this.client) {
      return { success: false, error: 'Twilio client not configured' };
    }

    try {
      const incomingPhoneNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber: e164,
      });

      return {
        success: true,
        numberSid: incomingPhoneNumber.sid,
        e164: incomingPhoneNumber.phoneNumber,
      };
    } catch (error: any) {
      this.logger.error('Failed to purchase number', error);
      return {
        success: false,
        error: this.translateTwilioError(error),
      };
    }
  }

  async importNumber(e164: string): Promise<PurchaseNumberResult> {
    if (!this.client) {
      return { success: false, error: 'Twilio client not configured' };
    }

    try {
      // Verify number exists in account
      const numbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber: e164,
        limit: 1,
      });

      if (numbers.length === 0) {
        return {
          success: false,
          error: 'Number not found in Twilio account',
        };
      }

      return {
        success: true,
        numberSid: numbers[0].sid,
        e164: numbers[0].phoneNumber,
      };
    } catch (error: any) {
      this.logger.error('Failed to import number', error);
      return {
        success: false,
        error: this.translateTwilioError(error),
      };
    }
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.client) {
      return { success: false, error: 'Twilio client not configured' };
    }

    try {
      const message = await this.client.messages.create({
        to: params.to,
        from: params.from,
        body: params.body,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error: any) {
      this.logger.error('Failed to send message', error);
      return {
        success: false,
        error: this.translateTwilioError(error),
      };
    }
  }

  async getDeliveryStatus(messageSid: string): Promise<DeliveryStatus> {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();

      let status: DeliveryStatus['status'] = 'queued';
      if (message.status === 'sent' || message.status === 'delivered') {
        status = message.status;
      } else if (message.status === 'failed' || message.status === 'undelivered') {
        status = 'failed';
      }

      return {
        messageSid: message.sid,
        status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to get delivery status', error);
      return {
        messageSid,
        status: 'failed',
        errorMessage: this.translateTwilioError(error),
      };
    }
  }

  async verifyWebhook(
    rawBody: string,
    signature: string,
    url: string,
  ): Promise<WebhookVerificationResult> {
    if (!this.config.webhookAuthToken) {
      this.logger.warn('Webhook auth token not configured, skipping verification');
      return { valid: true }; // Allow in dev
    }

    try {
      const isValid = twilio.validateRequest(
        this.config.webhookAuthToken,
        signature,
        url,
        rawBody as any,
      );

      return { valid: isValid };
    } catch (error: any) {
      this.logger.error('Webhook verification failed', error);
      return { valid: false, error: 'Webhook signature verification failed' };
    }
  }

  async configureWebhook(numberSid: string, webhookUrl: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.incomingPhoneNumbers(numberSid).update({
        smsUrl: webhookUrl,
        statusCallback: webhookUrl,
      });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to configure webhook', error);
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Twilio client not configured' };
    }

    try {
      // Test by fetching account info
      if (!this.config.accountSid) {
        return { success: false, error: 'Account SID not configured' };
      }
      await this.client.api.accounts(this.config.accountSid).fetch();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.translateTwilioError(error),
      };
    }
  }

  /**
   * Translate Twilio error codes to human-readable messages
   */
  private translateTwilioError(error: any): string {
    const code = error.code;
    const message = error.message || 'Unknown error';

    // Common Twilio error translations
    const translations: Record<number, string> = {
      20003: 'Unable to connect to Twilio. Check Account SID and Auth Token.',
      21211: 'Invalid phone number format.',
      21608: 'Number not available for purchase.',
      21610: 'Number already owned or unavailable.',
      21614: 'Unable to send message. Check recipient number.',
      21617: 'Unable to send message. Number is unsubscribed.',
    };

    if (code && translations[code]) {
      return translations[code];
    }

    return `Twilio error: ${message}`;
  }
}
