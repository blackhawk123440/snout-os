/**
 * GET/POST/DELETE /api/settings/messaging-provider
 * View and update org messaging provider configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { prisma } from '@/lib/db';

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const messageAccount = await (prisma as any).messageAccount.findFirst({
      where: { orgId: ctx.orgId },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => null);

    const twilioCredentials = await getProviderCredentials(ctx.orgId);

    let activeProvider: 'twilio' | 'openphone' | 'none' = 'none';
    let openphoneConfig: any = null;

    if (messageAccount?.provider === 'openphone' && messageAccount.providerConfigJson) {
      activeProvider = 'openphone';
      try { openphoneConfig = JSON.parse(messageAccount.providerConfigJson); } catch {}
    } else if (twilioCredentials) {
      activeProvider = 'twilio';
    } else if (process.env.OPENPHONE_API_KEY) {
      activeProvider = 'openphone';
    }

    return NextResponse.json({
      activeProvider,
      twilio: {
        connected: !!twilioCredentials,
      },
      openphone: {
        connected: activeProvider === 'openphone',
        phoneNumberId: openphoneConfig?.phoneNumberId || null,
        phoneNumber: openphoneConfig?.phoneNumber || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load provider status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, config } = body;

    if (provider === 'openphone') {
      if (!config?.apiKey || !config?.phoneNumberId) {
        return NextResponse.json({ error: 'API key and phone number ID are required' }, { status: 400 });
      }

      const configJson = JSON.stringify({
        apiKey: config.apiKey,
        phoneNumberId: config.phoneNumberId,
        phoneNumber: config.phoneNumber || null,
        webhookSecret: config.webhookSecret || null,
      });

      await (prisma as any).messageAccount.upsert({
        where: { orgId: ctx.orgId },
        create: {
          orgId: ctx.orgId,
          provider: 'openphone',
          providerConfigJson: configJson,
        },
        update: {
          provider: 'openphone',
          providerConfigJson: configJson,
        },
      });

      // Create MessageNumber record if phone number provided
      if (config.phoneNumber) {
        await (prisma as any).messageNumber.upsert({
          where: { orgId_e164: { orgId: ctx.orgId, e164: config.phoneNumber } },
          create: {
            orgId: ctx.orgId,
            provider: 'openphone',
            providerNumberSid: config.phoneNumberId,
            e164: config.phoneNumber,
            numberClass: 'front_desk',
            status: 'active',
          },
          update: {
            provider: 'openphone',
            providerNumberSid: config.phoneNumberId,
            status: 'active',
          },
        });
      }

      return NextResponse.json({ success: true, activeProvider: 'openphone' });
    }

    if (provider === 'twilio') {
      const credentials = await getProviderCredentials(ctx.orgId);
      if (!credentials) {
        return NextResponse.json({ error: 'Twilio credentials not configured. Use the Twilio setup flow.' }, { status: 400 });
      }
      return NextResponse.json({ success: true, activeProvider: 'twilio' });
    }

    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

export async function DELETE() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await (prisma as any).messageAccount.deleteMany({ where: { orgId: ctx.orgId, provider: 'openphone' } });
    await (prisma as any).messageNumber.updateMany({
      where: { orgId: ctx.orgId, provider: 'openphone' },
      data: { status: 'inactive' },
    });
    return NextResponse.json({ success: true, activeProvider: 'none' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove provider' }, { status: 500 });
  }
}
