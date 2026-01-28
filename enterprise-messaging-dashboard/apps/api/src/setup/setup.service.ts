import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import type { IProvider } from '../provider/provider.interface';

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private configService: ConfigService,
    @Inject('PROVIDER') private provider: IProvider,
  ) {}

  /**
   * Connect provider (save credentials encrypted)
   * 
   * Note: In production, credentials should be encrypted at rest.
   * For now, we configure the provider and audit the connection.
   */
  async connectProvider(orgId: string, config: { accountSid: string; authToken: string }) {
    // Test connection first
    const testResult = await this.testConnection(config);
    if (!testResult.success) {
      throw new BadRequestException(
        `Connection failed: ${testResult.error || 'Unknown error'}`,
      );
    }

    // In production, credentials would be stored encrypted
    // For now, we just verify they work and audit the connection
    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'organization',
      entityId: orgId,
      eventType: 'setup.provider.connected',
      payload: { accountSid: config.accountSid },
    });

    return { success: true };
  }

  /**
   * Test provider connection
   */
  async testConnection(config?: { accountSid?: string; authToken?: string }) {
    const providerMode = this.configService.get('PROVIDER_MODE', 'mock');

    try {
      // If test credentials provided, we'd configure provider temporarily
      // For now, test with current provider configuration

      // Test current provider
      const result = await this.provider.testConnection();
      return {
        success: result.success,
        error: result.error,
        providerMode,
        accountName: (result as any).accountName,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.translateError(error),
        providerMode,
      };
    }
  }

  /**
   * Get provider status
   */
  async getProviderStatus(orgId: string) {
    const providerMode = this.configService.get('PROVIDER_MODE', 'mock');
    const result = await this.provider.testConnection();

    return {
      connected: result.success,
      providerMode: providerMode as 'mock' | 'twilio',
      accountName: (result as any).accountName,
      error: result.error,
    };
  }

  /**
   * Buy numbers
   */
  async buyNumbers(
    orgId: string,
    params: { class: string; areaCode?: string; country?: string; quantity?: number },
  ) {
    const searchParams = {
      areaCode: params.areaCode,
      country: params.country || 'US',
      limit: params.quantity || 1,
    };

    // Search for available numbers
    const available = await this.provider.searchNumbers(searchParams);
    if (available.length === 0) {
      throw new BadRequestException('No numbers available for the specified criteria');
    }

    const numbers: Array<{ e164: string; numberSid: string; cost?: number }> = [];
    let totalCost = 0;

    // Purchase up to requested quantity
    const quantity = Math.min(params.quantity || 1, available.length);
    for (let i = 0; i < quantity; i++) {
      try {
        const purchaseResult = await this.provider.purchaseNumber(available[i].e164);
        if (!purchaseResult.success) {
          throw new BadRequestException(purchaseResult.error || 'Failed to purchase number');
        }

        // Create number record
        const number = await this.prisma.messageNumber.create({
          data: {
            orgId,
            e164: purchaseResult.e164!,
            class: params.class,
            status: 'active',
            providerType: this.configService.get('PROVIDER_MODE', 'mock'),
            providerNumberSid: purchaseResult.numberSid,
            purchaseDate: new Date(),
          },
        });

        const cost = available[i].monthlyCostCents 
          ? available[i].monthlyCostCents! / 100 
          : (this.configService.get('PROVIDER_MODE', 'mock') === 'mock' ? 1.0 : undefined);
        if (cost) totalCost += cost;

        numbers.push({
          e164: purchaseResult.e164!,
          numberSid: purchaseResult.numberSid!,
          cost,
        });

        await this.audit.recordEvent({
          orgId,
          actorType: 'owner',
          entityType: 'messageNumber',
          entityId: number.id,
          eventType: 'number.purchased',
          payload: { e164: purchaseResult.e164, class: params.class, cost },
        });
      } catch (error: any) {
        this.logger.error(`Failed to purchase number ${i + 1}`, error);
        if (i === 0) {
          // First number failed, return error
          throw new BadRequestException(
            this.translateError(error) || 'Failed to purchase number',
          );
        }
        // Some numbers succeeded, continue
      }
    }

    return {
      success: true,
      numbers,
      totalCost: totalCost > 0 ? totalCost : undefined,
    };
  }

  /**
   * Import existing numbers
   */
  async importNumbers(
    orgId: string,
    params: { class: string; e164s?: string[]; numberSids?: string[] },
  ) {
    const numbers: Array<{ e164: string; numberSid: string }> = [];

    if (params.e164s) {
      for (const e164 of params.e164s) {
        // Validate E.164 format
        if (!/^\+[1-9]\d{1,14}$/.test(e164)) {
          throw new BadRequestException(`Invalid E.164 format: ${e164}`);
        }

        // Import number (provider will verify ownership)
        const importResult = await this.provider.importNumber(e164);
        if (!importResult.success) {
          throw new BadRequestException(
            `Failed to import ${e164}: ${importResult.error}`,
          );
        }

        const number = await this.prisma.messageNumber.create({
          data: {
            orgId,
            e164: importResult.e164!,
            class: params.class,
            status: 'active',
            providerType: this.configService.get('PROVIDER_MODE', 'mock'),
            providerNumberSid: importResult.numberSid || `imported-${e164}`,
            purchaseDate: new Date(),
          },
        });

        numbers.push({
          e164: importResult.e164!,
          numberSid: importResult.numberSid!,
        });

        await this.audit.recordEvent({
          orgId,
          actorType: 'owner',
          entityType: 'messageNumber',
          entityId: number.id,
          eventType: 'number.imported',
          payload: { e164: importResult.e164, class: params.class },
        });
      }
    }

    return { success: true, numbers };
  }

  /**
   * Get numbers status
   */
  async getNumbersStatus(orgId: string) {
    const [frontDesk, sitter, pool] = await Promise.all([
      this.prisma.messageNumber.findMany({
        where: { orgId, class: 'front_desk' },
        select: { id: true, e164: true, status: true },
      }),
      this.prisma.messageNumber.findMany({
        where: { orgId, class: 'sitter' },
        select: { id: true, e164: true, status: true },
      }),
      this.prisma.messageNumber.findMany({
        where: { orgId, class: 'pool' },
        select: { id: true, e164: true, status: true },
      }),
    ]);

    return {
      frontDesk: {
        count: frontDesk.length,
        numbers: frontDesk,
      },
      sitter: {
        count: sitter.length,
        numbers: sitter,
      },
      pool: {
        count: pool.length,
        numbers: pool,
      },
      hasFrontDesk: frontDesk.length > 0,
    };
  }

  /**
   * Install webhooks
   */
  async installWebhooks(orgId: string) {
    const webhookUrl = this.configService.get('TWILIO_WEBHOOK_URL') || 
      `${this.configService.get('APP_URL', 'http://localhost:3000')}/webhooks/twilio/inbound-sms`;

    try {
      // Get all active numbers and configure webhooks for each
      const numbers = await this.prisma.messageNumber.findMany({
        where: { orgId, status: 'active' },
      });

      let allSucceeded = true;
      for (const number of numbers) {
        if (number.providerNumberSid) {
          const success = await this.provider.configureWebhook(
            number.providerNumberSid,
            webhookUrl,
          );
          if (!success) {
            allSucceeded = false;
          }
        }
      }

      await this.audit.recordEvent({
        orgId,
        actorType: 'owner',
        entityType: 'organization',
        entityId: orgId,
        eventType: 'setup.webhooks.installed',
        payload: { webhookUrl, success: allSucceeded },
      });

      return {
        success: allSucceeded,
        webhookUrl: allSucceeded ? webhookUrl : undefined,
        error: allSucceeded ? undefined : 'Some numbers failed to configure',
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.translateError(error),
      };
    }
  }

  /**
   * Get webhook status
   */
  async getWebhookStatus(orgId: string) {
    const webhookUrl = this.configService.get('TWILIO_WEBHOOK_URL') || 
      `${this.configService.get('APP_URL', 'http://localhost:3000')}/webhooks/twilio/inbound-sms`;

    // In mock mode, webhooks are always "verified" for dev convenience
    const providerMode = this.configService.get('PROVIDER_MODE', 'mock');
    if (providerMode === 'mock') {
      return {
        configured: true,
        active: true,
        verified: true,
        webhookUrl,
      };
    }

    // For Twilio, we'd need to check actual webhook configuration
    // For now, assume configured if we have numbers
    const numberCount = await this.prisma.messageNumber.count({
      where: { orgId, status: 'active' },
    });

    return {
      configured: numberCount > 0,
      active: numberCount > 0,
      verified: numberCount > 0, // Simplified: assume verified if numbers exist
      webhookUrl: numberCount > 0 ? webhookUrl : undefined,
    };
  }

  /**
   * Check system readiness
   */
  async checkReadiness(orgId: string) {
    const checks: Array<{ name: string; passed: boolean; error?: string }> = [];

    // Check 1: Provider connected
    const providerTest = await this.provider.testConnection();
    checks.push({
      name: 'Provider Connection',
      passed: providerTest.success,
      error: providerTest.error,
    });

    // Check 2: Front desk number
    const frontDeskCount = await this.prisma.messageNumber.count({
      where: { orgId, class: 'front_desk', status: 'active' },
    });
    checks.push({
      name: 'Front Desk Number',
      passed: frontDeskCount > 0,
      error: frontDeskCount === 0 ? 'At least one Front Desk number is required' : undefined,
    });

    // Check 3: Webhooks installed
    const webhookStatus = await this.getWebhookStatus(orgId);
    checks.push({
      name: 'Webhook Installation',
      passed: webhookStatus.verified,
      error: (!webhookStatus.verified ? 'Webhooks not verified' : undefined),
    });

    const allPassed = checks.every((c) => c.passed);

    return {
      providerConnected: providerTest.success,
      frontDeskNumberConfigured: frontDeskCount > 0,
      webhookInstalled: webhookStatus.verified,
      ready: allPassed,
      checks,
    };
  }

  /**
   * Finish setup
   */
  async finishSetup(orgId: string) {
    const readiness = await this.checkReadiness(orgId);
    if (!readiness.ready) {
      throw new BadRequestException(
        'Setup cannot be completed. Please resolve all readiness checks.',
      );
    }

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'organization',
      entityId: orgId,
      eventType: 'setup.completed',
      payload: {},
    });

    return { success: true };
  }

  /**
   * Get setup progress
   */
  async getSetupProgress(orgId: string) {
    // Determine completed steps based on readiness
    const readiness = await this.checkReadiness(orgId);
    const numbersStatus = await this.getNumbersStatus(orgId);
    const webhookStatus = await this.getWebhookStatus(orgId);

    const completedSteps: number[] = [];

    // Step 1: Provider connected
    if (readiness.providerConnected) completedSteps.push(1);

    // Step 2: Connectivity verified (same as step 1)
    if (readiness.providerConnected) completedSteps.push(2);

    // Step 3: Front desk number
    if (numbersStatus.hasFrontDesk) completedSteps.push(3);

    // Step 4: Sitter numbers (optional, but mark if any exist)
    if (numbersStatus.sitter.count > 0) completedSteps.push(4);

    // Step 5: Pool numbers (optional, but mark if any exist)
    if (numbersStatus.pool.count > 0) completedSteps.push(5);

    // Step 6: Webhooks
    if (webhookStatus.verified) completedSteps.push(6);

    // Step 7: Readiness (all checks pass)
    if (readiness.ready) completedSteps.push(7);

    return {
      step: completedSteps.length + 1,
      completedSteps,
      data: {},
    };
  }

  /**
   * Save setup progress
   */
  async saveSetupProgress(orgId: string, progress: { step: number; data?: Record<string, unknown> }) {
    // Store in audit or a setup_progress table
    // For now, we'll compute progress on-demand
    return { success: true };
  }

  /**
   * Translate provider errors to human-readable messages
   */
  private translateError(error: any): string {
    const message = error?.message || String(error);

    if (message.includes('Invalid credentials') || message.includes('401')) {
      return 'Invalid provider credentials. Please check your Account SID and Auth Token.';
    }
    if (message.includes('Insufficient balance') || message.includes('20003')) {
      return 'Insufficient account balance. Please add funds to your provider account.';
    }
    if (message.includes('Not found') || message.includes('20404')) {
      return 'Resource not found. Please verify the number or configuration exists.';
    }
    if (message.includes('Rate limit') || message.includes('20429')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }

    return message || 'An unexpected error occurred. Please try again.';
  }

}

