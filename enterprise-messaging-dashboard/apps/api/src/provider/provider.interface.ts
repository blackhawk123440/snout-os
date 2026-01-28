/**
 * Provider Interface - Abstraction for messaging providers
 * 
 * This interface allows the system to work with any provider
 * (Twilio, Mock for dev, future providers) without coupling.
 */

export interface ProviderConfig {
  accountSid?: string;
  authToken?: string;
  webhookAuthToken?: string;
}

export interface SearchNumbersParams {
  areaCode?: string;
  country?: string;
  limit?: number;
}

export interface AvailableNumber {
  e164: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  monthlyCostCents?: number;
}

export interface PurchaseNumberResult {
  success: boolean;
  numberSid?: string;
  e164?: string;
  error?: string;
}

export interface SendMessageParams {
  to: string; // E.164
  from: string; // E.164 (must be owned by org)
  body: string;
}

export interface SendMessageResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  errorCode?: string;
}

export interface DeliveryStatus {
  messageSid: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

export interface IProvider {
  /**
   * Search for available numbers
   */
  searchNumbers(params: SearchNumbersParams): Promise<AvailableNumber[]>;

  /**
   * Purchase a number
   */
  purchaseNumber(e164: string): Promise<PurchaseNumberResult>;

  /**
   * Import an existing number (verify ownership)
   */
  importNumber(e164: string): Promise<PurchaseNumberResult>;

  /**
   * Send an SMS message
   */
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;

  /**
   * Get delivery status for a message
   */
  getDeliveryStatus(messageSid: string): Promise<DeliveryStatus>;

  /**
   * Verify webhook signature
   */
  verifyWebhook(
    rawBody: string,
    signature: string,
    url: string,
  ): Promise<WebhookVerificationResult>;

  /**
   * Configure webhook URL for a number
   */
  configureWebhook(numberSid: string, webhookUrl: string): Promise<boolean>;

  /**
   * Test connectivity
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
