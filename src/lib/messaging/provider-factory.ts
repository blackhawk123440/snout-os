/**
 * Provider Factory
 * 
 * Creates MessagingProvider instances for the Next.js frontend.
 * This is a simplified factory compared to the NestJS API's ProviderFactory.
 */

import type { MessagingProvider } from './provider';

/**
 * Mock provider implementation for cases where we don't need actual provider functionality
 * (e.g., when just assigning numbers, not sending messages)
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

  async sendMessage(options: any): Promise<any> {
    throw new Error('Not implemented');
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

  async updateSessionParticipants(options: any): Promise<{ success: boolean; error?: string }> {
    throw new Error('Not implemented');
  }
}

/**
 * Get a messaging provider instance for an organization
 * 
 * For number assignment operations, we typically don't need a fully configured provider.
 * This returns a mock provider that satisfies the interface.
 * 
 * @param orgId - Organization ID (currently unused but kept for future use)
 * @returns MessagingProvider instance
 */
export async function getMessagingProvider(orgId: string): Promise<MessagingProvider> {
  // For now, return a mock provider since number assignment doesn't require actual provider functionality
  // In the future, this could load Twilio credentials and return a configured Twilio provider
  return new MockProvider();
}
