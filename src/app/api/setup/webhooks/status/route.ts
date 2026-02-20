/**
 * Webhook Status Route
 * 
 * GET /api/setup/webhooks/status
 * Checks if webhooks are configured in Twilio
 * Falls back to direct Twilio API check if NestJS API is not available
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { env } from '@/lib/env';

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

  // Fallback: Check Twilio directly
  try {
    const credentials = await getProviderCredentials(orgId);
    
    if (!credentials) {
      return NextResponse.json({
        installed: false,
        url: null,
        lastReceivedAt: null,
        status: 'not_configured',
      }, { status: 200 });
    }

    // Get expected webhook URL
    const expectedWebhookUrl = env.TWILIO_WEBHOOK_URL || 
      `${env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages/webhook/twilio`;

    // Check Twilio numbers for webhook configuration
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);
    
    // Fetch all phone numbers and check their SMS webhook URLs
    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    
    let installed = false;
    let configuredUrl: string | null = null;
    
    for (const number of incomingNumbers) {
      if (number.smsUrl && number.smsUrl.includes('/api/messages/webhook/twilio')) {
        installed = true;
        configuredUrl = number.smsUrl;
        break;
      }
    }

    return NextResponse.json({
      installed,
      url: configuredUrl || (installed ? expectedWebhookUrl : null),
      lastReceivedAt: null, // TODO: Store last webhook received timestamp
      status: installed ? 'installed' : 'not_installed',
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Twilio] Error checking webhook status:', error);
    return NextResponse.json({
      installed: false,
      url: null,
      lastReceivedAt: null,
      status: 'error',
    }, { status: 200 }); // Return 200 with not installed status
  }
}
