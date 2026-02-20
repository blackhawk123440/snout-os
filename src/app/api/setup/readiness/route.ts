/**
 * Readiness Check Route
 * 
 * GET /api/setup/readiness
 * Checks if all prerequisites are met for messaging:
 * - Provider connected
 * - Numbers configured
 * - Webhooks installed
 * Falls back to direct checks if NestJS API is not available
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

  // Try NestJS API first if available
  if (API_BASE_URL) {
    try {
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });

      const apiUrl = `${API_BASE_URL}/api/setup/readiness`;
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
        if (responseData.provider && responseData.numbers && responseData.webhooks) {
          return NextResponse.json(responseData, { status: 200 });
        }
      }
    } catch (error: any) {
      console.warn('[BFF Proxy] Failed to reach API, using fallback:', error.message);
      // Fall through to direct checks
    }
  }

  // Fallback: Direct readiness checks
  try {
    // Check 1: Provider connected
    const credentials = await getProviderCredentials(orgId);
    const providerReady = !!credentials;
    const providerMessage = providerReady 
      ? 'Provider connected'
      : 'Provider not connected. Please connect Twilio credentials.';

    // Check 2: Numbers configured
    let numbersReady = false;
    let numbersMessage = 'No numbers configured';
    
    try {
      const numbers = await (prisma as any).messageNumber.findMany({
        where: { orgId, status: 'active' },
        take: 1,
      });
      
      if (numbers.length > 0) {
        // Check if front_desk number exists
        const frontDeskNumber = await (prisma as any).messageNumber.findFirst({
          where: { orgId, class: 'front_desk', status: 'active' },
        });
        
        if (frontDeskNumber) {
          numbersReady = true;
          numbersMessage = 'Numbers configured';
        } else {
          numbersMessage = 'Front desk number not configured';
        }
      }
    } catch (error: any) {
      console.error('[Readiness] Error checking numbers:', error);
      numbersMessage = 'Error checking numbers';
    }

    // Check 3: Webhooks installed
    let webhooksReady = false;
    let webhooksMessage = 'Webhooks not installed';
    
    if (credentials) {
      try {
        const twilio = require('twilio');
        const client = twilio(credentials.accountSid, credentials.authToken);
        const webhookUrl = env.TWILIO_WEBHOOK_URL || 
          `${env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages/webhook/twilio`;
        
        const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
        
        for (const number of incomingNumbers) {
          if (number.smsUrl && number.smsUrl.includes('/api/messages/webhook/twilio')) {
            webhooksReady = true;
            webhooksMessage = 'Webhooks installed';
            break;
          }
        }
        
        if (!webhooksReady) {
          webhooksMessage = 'Webhooks not installed. Click "Install Webhooks" to configure.';
        }
      } catch (error: any) {
        console.error('[Readiness] Error checking webhooks:', error);
        webhooksMessage = 'Error checking webhooks';
      }
    } else {
      webhooksMessage = 'Provider not connected';
    }

    const overall = providerReady && numbersReady && webhooksReady;

    return NextResponse.json({
      provider: { ready: providerReady, message: providerMessage },
      numbers: { ready: numbersReady, message: numbersMessage },
      webhooks: { ready: webhooksReady, message: webhooksMessage },
      overall,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Readiness] Error:', error);
    return NextResponse.json({
      provider: { ready: false, message: 'Error checking readiness' },
      numbers: { ready: false, message: 'Error checking readiness' },
      webhooks: { ready: false, message: 'Error checking readiness' },
      overall: false,
    }, { status: 200 }); // Return 200 with not ready status
  }
}
