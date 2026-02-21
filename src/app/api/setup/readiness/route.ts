/**
 * Readiness Check Route
 * 
 * GET /api/setup/readiness
 * Derived from same truth as provider status and webhook status:
 * - Provider Ready = credentials exist for org (same as provider status connected)
 * - Numbers Ready = at least one active MessageNumber for org
 * - Webhooks Ready = webhook status installed (same Twilio check)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { getWebhookStatusForOrg } from '@/lib/setup/webhook-status';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        provider: { ready: false, message: 'Unauthorized' },
        numbers: { ready: false, message: 'Unauthorized' },
        webhooks: { ready: false, message: 'Unauthorized' },
        overall: false,
      },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  try {
    const credentials = await getProviderCredentials(orgId);
    const providerReady = !!credentials;
    const providerMessage = providerReady
      ? 'Provider connected'
      : 'Provider not connected. Connect Twilio credentials first.';

    let numbersReady = false;
    let numbersMessage = 'No numbers configured';
    try {
      const numbers = await (prisma as any).messageNumber.findMany({
        where: { orgId, status: 'active' },
        take: 1,
      });
      if (numbers.length > 0) {
        const frontDesk = await (prisma as any).messageNumber.findFirst({
          where: { orgId, class: 'front_desk', status: 'active' },
        });
        if (frontDesk) {
          numbersReady = true;
          numbersMessage = 'Numbers configured';
        } else {
          numbersMessage = 'Front desk number not configured';
        }
      }
    } catch (err: any) {
      numbersMessage = err?.message || 'Error checking numbers';
    }

    let webhooksReady = false;
    let webhooksMessage = 'Webhooks not installed';
    const webhookStatus = await getWebhookStatusForOrg(orgId);
    if (webhookStatus) {
      webhooksReady = webhookStatus.installed;
      webhooksMessage = webhookStatus.installed
        ? 'Webhooks installed'
        : webhookStatus.unmatchedNumbers.length > 0
          ? 'Webhooks not installed. Click "Install Webhooks" to configure.'
          : 'No phone numbers to configure.';
    } else {
      webhooksMessage = 'Provider not connected';
    }

    const overall = providerReady && numbersReady && webhooksReady;
    return NextResponse.json({
      provider: { ready: providerReady, message: providerMessage },
      numbers: { ready: numbersReady, message: numbersMessage },
      webhooks: { ready: webhooksReady, message: webhooksMessage },
      overall,
      checkedAt: new Date().toISOString(),
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Readiness] Error:', error);
    const msg = error?.message || 'Error checking readiness';
    return NextResponse.json({
      provider: { ready: false, message: msg },
      numbers: { ready: false, message: msg },
      webhooks: { ready: false, message: msg },
      overall: false,
      checkedAt: new Date().toISOString(),
    }, { status: 200 });
  }
}
