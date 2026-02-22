/**
 * Sync Twilio numbers into MessageNumber table
 *
 * POST /api/setup/numbers/sync
 * Lists incoming phone numbers from Twilio and upserts them as MessageNumber
 * (first = front_desk, rest = pool). Use this so Test SMS and send pipeline have numbers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';
import { normalizeE164 } from '@/lib/messaging/phone-utils';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized', synced: 0 },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  try {
    const credentials = await getProviderCredentials(orgId);
    if (!credentials) {
      return NextResponse.json(
        { success: false, message: 'Connect Twilio first.', synced: 0 },
        { status: 400 }
      );
    }

    const twilio = require('twilio');
    const client = twilio(credentials.accountSid, credentials.authToken);
    const list = await client.incomingPhoneNumbers.list({ limit: 100 });

    if (list.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No Twilio numbers found for this account.', synced: 0 },
        { status: 200 }
      );
    }

    await (prisma as any).organization.upsert({
      where: { id: orgId },
      create: { id: orgId, name: orgId === 'default' ? 'Default' : orgId },
      update: {},
    });

    let index = 0;
    for (const n of list) {
      const e164 = normalizeE164((n.phoneNumber || '').toString());
      const numberClass = index === 0 ? 'front_desk' : 'pool';
      await (prisma as any).messageNumber.upsert({
        where: { e164 },
        create: {
          orgId,
          e164,
          class: numberClass,
          status: 'active',
          providerType: 'twilio',
          providerNumberSid: n.sid,
        },
        update: {
          orgId,
          status: 'active',
          providerNumberSid: n.sid,
        },
      });
      index++;
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${list.length} number(s). First is front_desk, rest are pool.`,
      synced: list.length,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Numbers Sync]', error?.message);
    const isAuth =
      error?.code === 20003 ||
      /authenticat/i.test(error?.message || '') ||
      error?.status === 401;
    return NextResponse.json(
      {
        success: false,
        message: isAuth
          ? 'Twilio rejected credentials. Re-save Account SID and Auth Token, then try again.'
          : error?.message || 'Failed to sync numbers',
        synced: 0,
      },
      { status: isAuth ? 400 : 500 }
    );
  }
}
