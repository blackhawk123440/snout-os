import { Injectable } from '@nestjs/common';
import { MockProviderService } from './mock-provider.service';
import { TwilioProviderService } from './twilio-provider.service';
import type { IProvider, ProviderConfig } from './provider.interface';

/**
 * Provider Factory - Creates and configures the appropriate provider
 * 
 * Supports:
 * - 'mock': For local development (no Twilio credentials needed)
 * - 'twilio': For production (requires Twilio credentials)
 */
@Injectable()
export class ProviderFactory {
  constructor(
    private mode: string,
    private mockProvider: MockProviderService,
    private twilioProvider: TwilioProviderService,
  ) {}

  getProvider(): IProvider {
    if (this.mode === 'mock') {
      return this.mockProvider;
    }

    if (this.mode === 'twilio') {
      return this.twilioProvider;
    }

    throw new Error(`Unknown provider mode: ${this.mode}`);
  }

  configureProvider(config: ProviderConfig): void {
    const provider = this.getProvider();

    if (provider === this.twilioProvider) {
      this.twilioProvider.configure(config);
    } else if (provider === this.mockProvider) {
      this.mockProvider.configure(config);
    }
  }
}
