/**
 * Install Webhooks Route
 * 
 * POST /api/setup/webhooks/install
 * Configures webhooks on Twilio incoming phone numbers (same object status checks).
 * Verifies by re-fetching numbers and checking smsUrl matches expected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { getTwilioWebhookUrl, webhookUrlMatches } from '@/lib/setup/webhook-url';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized', url: null },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  // Try NestJS API first if available
  if (API_BASE_URL) {
    try {
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });

      const apiUrl = `${API_BASE_URL}/api/setup/webhooks/install`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Ensure response matches expected schema
        if (responseData.success !== undefined && responseData.message !== undefined) {
          return NextResponse.json(responseData, { status: 200 });
        }
        return NextResponse.json({
          success: true,
          message: responseData.message || 'Webhooks installed successfully',
          url: responseData.url || null,
        }, { status: 200 });
      }
    } catch (error: any) {
      console.warn('[BFF Proxy] Failed to reach API, using fallback:', error.message);
      // Fall through to direct Twilio installation
    }
  }

  // Fallback: Install webhooks directly via Twilio API (phone numbers = same object status checks)
  const checkedAt = new Date().toISOString();
  try {
    const credentials = await getProviderCredentials(orgId);

    if (!credentials) {
      return NextResponse.json({
        success: false,
        message: 'No credentials found. Connect provider first.',
        url: null,
        verified: false,
        webhookUrlConfigured: false,
        orgId,
        checkedAt,
      }, { status: 400 });
    }

    const webhookUrl = getTwilioWebhookUrl();
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);

    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 100 });
    let configuredCount = 0;
    const errors: string[] = [];

    for (const number of incomingNumbers) {
      try {
        await client.incomingPhoneNumbers(number.sid).update({
          smsUrl: webhookUrl,
          smsMethod: 'POST',
        });
        configuredCount++;
      } catch (error: any) {
        const msg = `${number.phoneNumber}: ${error?.message || 'Unknown error'}`;
        console.error('[Webhook Install]', msg);
        errors.push(msg);
      }
    }

    if (configuredCount === 0) {
      return NextResponse.json({
        success: false,
        message: errors.length ? errors[0] : 'No phone numbers found to configure',
        url: null,
        verified: false,
        webhookUrlConfigured: false,
        orgId,
        checkedAt,
        details: { errors },
      }, { status: 400 });
    }

    // Verify: re-fetch numbers and confirm at least one has our webhook URL (same check as status)
    let verified = false;
    try {
      const after = await client.incomingPhoneNumbers.list({ limit: 20 });
      for (const n of after) {
        if (webhookUrlMatches(n.smsUrl)) {
          verified = true;
          break;
        }
      }
    } catch (verifyErr: any) {
      console.error('[Webhook Install] Verify step failed:', verifyErr);
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: verified
        ? `Webhooks installed and verified on ${configuredCount} number(s)`
        : errors.length
          ? `Configured ${configuredCount} number(s) but some failed; verification ${verified ? 'passed' : 'failed'}`
          : `Configured ${configuredCount} number(s); verification ${verified ? 'passed' : 'failed'}`,
      url: webhookUrl,
      verified,
      webhookUrlConfigured: verified,
      orgId,
      checkedAt,
      details: errors.length ? { configuredCount, errors } : undefined,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Twilio] Error installing webhooks:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to install webhooks',
      url: null,
      verified: false,
      webhookUrlConfigured: false,
      orgId,
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
