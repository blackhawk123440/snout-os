/**
 * Install Webhooks Route
 * 
 * POST /api/setup/webhooks/install
 * Configures webhooks in Twilio for all active phone numbers
 * Falls back to direct Twilio API if NestJS API is not available
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { env } from '@/lib/env';

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

  // Fallback: Install webhooks directly via Twilio API
  try {
    const credentials = await getProviderCredentials(orgId);
    
    if (!credentials) {
      return NextResponse.json({
        success: false,
        message: 'No credentials found. Please connect provider first.',
        url: null,
      }, { status: 400 });
    }

    // Get webhook URL
    const webhookUrl = env.TWILIO_WEBHOOK_URL || 
      `${env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages/webhook/twilio`;

    // Configure webhooks via Twilio API
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);
    
    // Fetch all phone numbers
    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 100 });
    
    let allSucceeded = true;
    let configuredCount = 0;
    
    for (const number of incomingNumbers) {
      try {
        // Update SMS webhook URL
        await client.incomingPhoneNumbers(number.sid).update({
          smsUrl: webhookUrl,
          smsMethod: 'POST',
        });
        configuredCount++;
      } catch (error: any) {
        console.error(`[Webhook Install] Failed to configure webhook for ${number.phoneNumber}:`, error);
        allSucceeded = false;
      }
    }

    if (configuredCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No phone numbers found to configure',
        url: null,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded 
        ? `Webhooks installed successfully on ${configuredCount} number(s)`
        : `Webhooks installed on ${configuredCount} number(s), but some failed`,
      url: webhookUrl,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Twilio] Error installing webhooks:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to install webhooks',
      url: null,
    }, { status: 500 });
  }
}
