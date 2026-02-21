/**
 * Install Webhooks Route
 * 
 * POST /api/setup/webhooks/install
 * Configures webhooks on Twilio IncomingPhoneNumbers (per-number smsUrl), not Messaging Service.
 * Returns updatedNumbers[], numbersFetchedCount, numbersUpdatedCount, accountSidMasked, firstTwilioError.
 * 409 when numbersFetchedCount === 0 (no Twilio numbers for this account).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { getTwilioWebhookUrl, webhookUrlMatches } from '@/lib/setup/webhook-url';

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

  const checkedAt = new Date().toISOString();
  try {
    const credentials = await getProviderCredentials(orgId);

    if (!credentials) {
      return NextResponse.json({
        success: false,
        message: 'No credentials found. Connect provider first.',
        webhookTarget: 'incoming_phone_numbers',
        numbersFetchedCount: 0,
        numbersUpdatedCount: 0,
        accountSidMasked: null,
        firstTwilioError: null,
        url: null,
        verified: false,
        webhookUrlConfigured: false,
        orgId,
        checkedAt,
        updatedNumbers: [],
      }, { status: 400 });
    }

    const newSmsUrl = getTwilioWebhookUrl();
    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);
    const accountSidMasked = credentials.accountSid
      ? `${credentials.accountSid.substring(0, 4)}...${credentials.accountSid.substring(credentials.accountSid.length - 4)}`
      : null;

    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 100 });
    const numbersFetchedCount = incomingNumbers.length;

    if (numbersFetchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No Twilio numbers found for this account',
        webhookTarget: 'incoming_phone_numbers',
        numbersFetchedCount: 0,
        numbersUpdatedCount: 0,
        accountSidMasked,
        firstTwilioError: null,
        url: null,
        verified: false,
        orgId,
        checkedAt,
        updatedNumbers: [],
      }, { status: 409 });
    }

    const beforeMap = new Map<string, string | null>();
    for (const n of incomingNumbers) beforeMap.set(n.sid, n.smsUrl ?? null);

    const errors: string[] = [];
    let numbersUpdatedCount = 0;
    for (const number of incomingNumbers) {
      try {
        await client.incomingPhoneNumbers(number.sid).update({
          smsUrl: newSmsUrl,
          smsMethod: 'POST',
        });
        numbersUpdatedCount++;
      } catch (error: any) {
        const msg = `${number.phoneNumber}: ${error?.message || 'Unknown error'}`;
        console.error('[Webhook Install]', msg);
        errors.push(msg);
      }
    }

    // Re-fetch and build updatedNumbers with per-number verified (same normalization as status)
    const after = await client.incomingPhoneNumbers.list({ limit: 100 });
    const updatedNumbers: Array<{
      phoneNumberSid: string;
      e164: string;
      oldSmsUrl: string | null;
      newSmsUrl: string;
      verified: boolean;
    }> = [];
    for (const n of after) {
      const oldSmsUrl = beforeMap.get(n.sid) ?? null;
      const verified = webhookUrlMatches(n.smsUrl);
      updatedNumbers.push({
        phoneNumberSid: n.sid,
        e164: n.phoneNumber || '',
        oldSmsUrl,
        newSmsUrl,
        verified,
      });
    }
    const verified = updatedNumbers.some((u) => u.verified);
    const configuredCount = updatedNumbers.length;
    const firstTwilioError = errors[0] ?? null;

    return NextResponse.json({
      success: errors.length === 0,
      message: verified
        ? `Webhooks installed and verified on ${configuredCount} number(s)`
        : errors.length
          ? `Configured ${configuredCount} number(s) but some failed; verification ${verified ? 'passed' : 'failed'}`
          : `Configured ${configuredCount} number(s); verification ${verified ? 'passed' : 'failed'}`,
      webhookTarget: 'incoming_phone_numbers',
      numbersFetchedCount,
      numbersUpdatedCount,
      accountSidMasked,
      firstTwilioError,
      url: newSmsUrl,
      verified,
      webhookUrlConfigured: verified,
      orgId,
      checkedAt,
      updatedNumbers,
      webhookUrlExpected: newSmsUrl,
      details: errors.length ? { configuredCount, errors } : undefined,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Twilio] Error installing webhooks:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to install webhooks',
      webhookTarget: 'incoming_phone_numbers',
      numbersFetchedCount: 0,
      numbersUpdatedCount: 0,
      accountSidMasked: null,
      firstTwilioError: error?.message ?? null,
      url: null,
      verified: false,
      webhookUrlConfigured: false,
      orgId,
      checkedAt: new Date().toISOString(),
      updatedNumbers: [],
    }, { status: 500 });
  }
}
