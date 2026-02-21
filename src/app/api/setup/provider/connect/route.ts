/**
 * Connect Provider Route
 * 
 * POST /api/setup/provider/connect
 * Saves Twilio credentials to database (encrypted), then verifies they can be read back.
 * Returns verified: true only when GET provider status would see connected: true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/messaging/encryption';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  let body: { accountSid: string; authToken: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }

  const accountSid = String(body.accountSid ?? '').trim();
  const authToken = String(body.authToken ?? '').trim();
  if (!accountSid || !authToken) {
    return NextResponse.json(
      { success: false, message: 'Account SID and Auth Token are required' },
      { status: 400 }
    );
  }

  // Always use direct Prisma so connect and status use the same DB (dashboard self-contained).
  try {
    let encryptedConfig: string;
    try {
      encryptedConfig = encrypt(JSON.stringify({
        accountSid,
        authToken,
      }));
    } catch (encErr: any) {
      console.error('[Connect] Encryption failed:', encErr);
      return NextResponse.json({
        success: false,
        message: process.env.NODE_ENV === 'development'
          ? `Encryption failed: ${encErr?.message}. Set ENCRYPTION_KEY in .env.`
          : 'Server configuration error. Contact support.',
        verified: false,
        ok: false,
        orgId,
        checkedAt: new Date().toISOString(),
      }, { status: 500 });
    }

    await prisma.providerCredential.upsert({
      where: { orgId },
      update: {
        encryptedConfig,
        updatedAt: new Date(),
      },
      create: {
        orgId,
        providerType: 'twilio',
        encryptedConfig,
      },
    });

    // Verify: read back from same store status endpoint uses
    const verifiedCreds = await getProviderCredentials(orgId);
    const readBackOk = !!verifiedCreds && verifiedCreds.accountSid === accountSid;
    const checkedAt = new Date().toISOString();

    if (!readBackOk) {
      return NextResponse.json({
        success: false,
        message: 'Credentials saved but verification failed. Check diagnostics.',
        verified: false,
        ok: false,
        orgId,
        checkedAt,
      }, { status: 200 });
    }

    // Verify Twilio accepts these credentials (same API used by webhook install)
    try {
      const twilio = require('twilio');
      const client = twilio(verifiedCreds!.accountSid, verifiedCreds!.authToken);
      await client.incomingPhoneNumbers.list({ limit: 1 });
    } catch (twilioErr: any) {
      const isAuthError =
        twilioErr?.code === 20003 ||
        /authenticat/i.test(twilioErr?.message || '') ||
        twilioErr?.status === 401;
      console.error('[Connect] Twilio verification failed:', twilioErr?.code, twilioErr?.message);
      return NextResponse.json({
        success: false,
        message: isAuthError
          ? 'Twilio rejected the credentials. Check Account SID and Auth Token (e.g. no extra spaces, use the secret Auth Token from Twilio Console).'
          : twilioErr?.message || 'Twilio verification failed.',
        verified: false,
        ok: false,
        orgId,
        checkedAt,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'Provider credentials saved and verified with Twilio',
      verified: true,
      ok: true,
      orgId,
      providerAccountSid: accountSid.substring(0, 4) + '...',
      checkedAt,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Prisma] Error saving credentials:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to save credentials',
      verified: false,
      ok: false,
      orgId,
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
