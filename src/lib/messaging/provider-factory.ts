/**
 * Provider Factory
 *
 * Creates MessagingProvider instances. Primary provider: Twilio (messaging inbox, webhooks, send).
 * OpenPhone is used only for legacy owner-alert flows (message-utils) when configured.
 */

import type { MessagingProvider } from './provider';
import { getProviderCredentials, type ProviderCredentials } from './provider-credentials';
import { TwilioProvider } from './providers/twilio';

/**
 * Mock provider when no real provider is configured. Throws on sendMessage.
 */
class MockProvider implements MessagingProvider {
  verifyWebhook(rawBody: string, signature: string, webhookUrl: string): boolean {
    return false;
  }

  parseInbound(payload: any): any {
    throw new Error('Not implemented');
  }

  parseStatusCallback(payload: any): any {
    throw new Error('Not implemented');
  }

  async sendMessage(): Promise<never> {
    throw new Error('Twilio credentials not configured. Connect provider in /setup or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }

  async createSession(options: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async createParticipant(options: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async sendViaProxy(options: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateSessionParticipants(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

/**
 * Get a messaging provider instance for an organization.
 * Returns TwilioProvider when credentials exist (DB or env); otherwise MockProvider.
 *
 * @param orgId - Organization ID
 * @returns MessagingProvider instance
 */
export async function getMessagingProvider(orgId: string): Promise<MessagingProvider> {
  const credentials: ProviderCredentials | null = await getProviderCredentials(orgId);
  if (credentials) {
    return new TwilioProvider(undefined, orgId, credentials);
  }
  return new MockProvider();
}
