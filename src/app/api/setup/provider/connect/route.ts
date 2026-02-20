/**
 * Connect Provider Route
 * 
 * POST /api/setup/provider/connect
 * Saves Twilio credentials to database (encrypted), then verifies they can be read back.
 * Returns verified: true only when GET provider status would see connected: true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/messaging/encryption';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

  if (!body.accountSid || !body.authToken) {
    return NextResponse.json(
      { success: false, message: 'Account SID and Auth Token are required' },
      { status: 400 }
    );
  }

  // Try NestJS API first if available
  if (API_BASE_URL) {
    try {
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });

      const apiUrl = `${API_BASE_URL}/api/setup/provider/connect`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Ensure response matches expected schema
        if (responseData.success !== undefined && responseData.message !== undefined) {
          return NextResponse.json(responseData, { status: 200 });
        }
        // If API returns different format, normalize it
        return NextResponse.json({
          success: true,
          message: responseData.message || 'Provider credentials saved successfully',
        }, { status: 200 });
      }
    } catch (error: any) {
      console.warn('[BFF Proxy] Failed to reach API, using fallback:', error.message);
      // Fall through to Prisma fallback
    }
  }

  // Fallback: Direct Prisma implementation
  try {
    const encryptedConfig = encrypt(JSON.stringify({
      accountSid: body.accountSid,
      authToken: body.authToken,
    }));

    await (prisma as any).providerCredential.upsert({
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
    const verified = !!verifiedCreds && verifiedCreds.accountSid === body.accountSid;
    const checkedAt = new Date().toISOString();

    if (!verified) {
      return NextResponse.json({
        success: false,
        message: 'Credentials saved but verification failed. Check diagnostics.',
        verified: false,
        ok: false,
        orgId,
        checkedAt,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'Provider credentials saved and verified',
      verified: true,
      ok: true,
      orgId,
      providerAccountSid: body.accountSid?.substring(0, 4) + '...',
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
