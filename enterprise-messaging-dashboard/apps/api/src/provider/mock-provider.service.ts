import { Injectable } from '@nestjs/common';
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
 * Mock Provider - For local development and testing
 * 
 * Simulates Twilio behavior without requiring real credentials.
 * All operations are in-memory and deterministic.
 */
@Injectable()
export class MockProviderService implements IProvider {
  private config: ProviderConfig = {};
  private purchasedNumbers: Map<string, { e164: string; numberSid: string }> = new Map();
  private sentMessages: Map<string, { params: SendMessageParams; messageSid: string }> = new Map();
  private messageStatuses: Map<string, DeliveryStatus> = new Map();

  constructor() {
    // Initialize with some mock numbers
    this.purchasedNumbers.set('mock-sid-1', {
      e164: '+15551234567',
      numberSid: 'mock-sid-1',
    });
  }

  configure(config: ProviderConfig): void {
    this.config = config;
  }

  async searchNumbers(params: SearchNumbersParams): Promise<AvailableNumber[]> {
    // Generate mock available numbers
    const numbers: AvailableNumber[] = [];
    const areaCode = params.areaCode || '555';
    const limit = params.limit || 10;

    for (let i = 0; i < limit; i++) {
      const last4 = String(1000 + i).padStart(4, '0');
      numbers.push({
        e164: `+1${areaCode}${last4}`,
        friendlyName: `(${areaCode}) ${last4.substring(0, 3)}-${last4.substring(3)}`,
        locality: 'Mock City',
        region: 'Mock State',
        monthlyCostCents: 100, // $1/month
      });
    }

    return numbers;
  }

  async purchaseNumber(e164: string): Promise<PurchaseNumberResult> {
    // Validate E.164 format
    if (!/^\+[1-9]\d{1,14}$/.test(e164)) {
      return {
        success: false,
        error: 'Invalid E.164 format',
      };
    }

    const numberSid = `mock-sid-${Date.now()}`;
    this.purchasedNumbers.set(numberSid, { e164, numberSid });

    return {
      success: true,
      numberSid,
      e164,
    };
  }

  async importNumber(e164: string): Promise<PurchaseNumberResult> {
    // In mock mode, importing is same as purchasing
    return this.purchaseNumber(e164);
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    // Validate E.164 formats
    if (!/^\+[1-9]\d{1,14}$/.test(params.to) || !/^\+[1-9]\d{1,14}$/.test(params.from)) {
      return {
        success: false,
        error: 'Invalid E.164 format',
        errorCode: 'INVALID_NUMBER',
      };
    }

    // Check if from number is "owned"
    const owned = Array.from(this.purchasedNumbers.values()).some((n) => n.e164 === params.from);
    if (!owned) {
      return {
        success: false,
        error: 'From number not owned by organization',
        errorCode: 'UNAUTHORIZED_NUMBER',
      };
    }

    const messageSid = `mock-msg-${Date.now()}`;
    this.sentMessages.set(messageSid, { params, messageSid });

    // Simulate delivery status progression
    setTimeout(() => {
      this.messageStatuses.set(messageSid, {
        messageSid,
        status: 'sent',
      });
    }, 100);

    setTimeout(() => {
      this.messageStatuses.set(messageSid, {
        messageSid,
        status: 'delivered',
      });
    }, 500);

    return {
      success: true,
      messageSid,
    };
  }

  async getDeliveryStatus(messageSid: string): Promise<DeliveryStatus> {
    const status = this.messageStatuses.get(messageSid);
    if (status) {
      return status;
    }

    // Default to sent if message exists
    if (this.sentMessages.has(messageSid)) {
      return {
        messageSid,
        status: 'sent',
      };
    }

    return {
      messageSid,
      status: 'failed',
      errorCode: 'NOT_FOUND',
      errorMessage: 'Message not found',
    };
  }

  async verifyWebhook(
    rawBody: string,
    signature: string,
    url: string,
  ): Promise<WebhookVerificationResult> {
    // In mock mode, accept all webhooks (for dev convenience)
    // In production, this would verify the signature
    return { valid: true };
  }

  async configureWebhook(numberSid: string, webhookUrl: string): Promise<boolean> {
    // In mock mode, always succeed
    return true;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // Mock always succeeds
    return { success: true };
  }

  // Mock-specific helper methods for testing
  simulateInboundMessage(params: {
    from: string;
    to: string;
    body: string;
    messageSid?: string;
  }): { messageSid: string; rawBody: string } {
    const messageSid = params.messageSid || `mock-inbound-${Date.now()}`;
    const rawBody = JSON.stringify({
      MessageSid: messageSid,
      From: params.from,
      To: params.to,
      Body: params.body,
    });
    return { messageSid, rawBody };
  }

  simulateDeliveryCallback(params: {
    messageSid: string;
    status: 'delivered' | 'failed';
    errorCode?: string;
  }): string {
    return JSON.stringify({
      MessageSid: params.messageSid,
      MessageStatus: params.status,
      ErrorCode: params.errorCode,
    });
  }
}
