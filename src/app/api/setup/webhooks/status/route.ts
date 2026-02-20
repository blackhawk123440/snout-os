/**
 * Webhook Status Route
 * 
 * GET /api/setup/webhooks/status
 * Checks Twilio incoming phone numbers for smsUrl (same object install configures).
 * Uses same URL normalization as install so status and install agree.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { getTwilioWebhookUrl, webhookUrlMatches } from '@/lib/setup/webhook-url';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { installed: false, url: null, lastReceivedAt: null, status: 'not_installed' },
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

      const apiUrl = `${API_BASE_URL}/api/setup/webhooks/status`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        // Ensure response matches expected schema
        if (responseData.installed !== undefined) {
          return NextResponse.json(responseData, { status: 200 });
        }
      }
    } catch (error: any) {
      console.warn('[BFF Proxy] Failed to reach API, using fallback:', error.message);
      // Fall through to Twilio API check
    }
  }

  // Fallback: Check Twilio directly (same entity as install: incoming phone numbers)
  const checkedAt = new Date().toISOString();
  try {
    const credentials = await getProviderCredentials(orgId);

    if (!credentials) {
      return NextResponse.json({
        installed: false,
        url: null,
        lastReceivedAt: null,
        status: 'not_configured',
        checkedAt,
        verified: false,
      }, { status: 200 });
    }

    const expectedWebhookUrl = getTwilioWebhookUrl();
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);
    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });

    let installed = false;
    let configuredUrl: string | null = null;
    for (const number of incomingNumbers) {
      if (webhookUrlMatches(number.smsUrl)) {
        installed = true;
        configuredUrl = number.smsUrl?.trim().replace(/\/+$/, '') || expectedWebhookUrl;
        break;
      }
    }

    return NextResponse.json({
      installed,
      url: configuredUrl || (installed ? expectedWebhookUrl : null),
      lastReceivedAt: null,
      status: installed ? 'installed' : 'not_installed',
      checkedAt,
      verified: installed,
      webhookUrlExpected: expectedWebhookUrl,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Twilio] Error checking webhook status:', error);
    return NextResponse.json({
      installed: false,
      url: null,
      lastReceivedAt: null,
      status: 'error',
      checkedAt,
      verified: false,
      errorDetail: error?.message || 'Failed to check Twilio webhook configuration',
    }, { status: 200 });
  }
}
