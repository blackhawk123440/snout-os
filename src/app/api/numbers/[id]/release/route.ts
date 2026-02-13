/**
 * Release from Quarantine Route
 * 
 * POST /api/numbers/[id]/release
 * Proxies to NestJS API to release a number from quarantine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API server not configured' },
      { status: 500 }
    );
  }

  const params = await context.params;
  const numberId = params.id;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let apiToken: string;
  try {
    const user = session.user as any;
    apiToken = await mintApiJWT({
      userId: user.id || user.email || '',
      orgId: user.orgId || 'default',
      role: user.role || (user.sitterId ? 'sitter' : 'owner'),
      sitterId: user.sitterId || null,
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to mint API JWT:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with API' },
      { status: 500 }
    );
  }

  // Read request body for forceRestore and restoreReason
  let body: { forceRestore?: boolean; restoreReason?: string } = {};
  try {
    const bodyText = await request.text();
    if (bodyText) {
      body = JSON.parse(bodyText);
    }
  } catch {
    // Empty body is OK for normal release
  }

  // API endpoint is /api/numbers/:id/release-from-quarantine
  const apiUrl = `${API_BASE_URL}/api/numbers/${numberId}/release-from-quarantine`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        forceRestore: body.forceRestore || false,
        restoreReason: body.restoreReason,
      }),
    });

    const contentType = response.headers.get('content-type');
    let responseData: any;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error('[BFF Proxy] API error response:', responseData);
      return NextResponse.json(responseData, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
      });
    }

    // API returns the updated number object directly
    // Transform to match frontend schema: { success: boolean, message: string }
    return NextResponse.json({
      success: true,
      message: 'Number released from quarantine',
    }, { status: 200 });

  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward release request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
