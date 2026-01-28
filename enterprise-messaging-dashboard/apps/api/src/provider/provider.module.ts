import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockProviderService } from './mock-provider.service';
import { TwilioProviderService } from './twilio-provider.service';
import { ProviderFactory } from './provider.factory';
import type { IProvider } from './provider.interface';

@Global()
@Module({
  providers: [
    MockProviderService,
    TwilioProviderService,
    {
      provide: 'PROVIDER',
      useFactory: (
        configService: ConfigService,
        mockProvider: MockProviderService,
        twilioProvider: TwilioProviderService,
      ) => {
        const mode = configService.get('PROVIDER_MODE', 'mock');
        const factory = new ProviderFactory(mode, mockProvider, twilioProvider);
        const provider = factory.getProvider();
        
        // Configure provider if credentials available
        if (mode === 'twilio') {
          const accountSid = configService.get('TWILIO_ACCOUNT_SID');
          const authToken = configService.get('TWILIO_AUTH_TOKEN');
          const webhookAuthToken = configService.get('TWILIO_WEBHOOK_AUTH_TOKEN');
          if (accountSid && authToken) {
            factory.configureProvider({
              accountSid,
              authToken,
              webhookAuthToken,
            });
          }
        }
        
        return provider;
      },
      inject: [ConfigService, MockProviderService, TwilioProviderService],
    },
  ],
  exports: ['PROVIDER', MockProviderService, TwilioProviderService],
})
export class ProviderModule {}
