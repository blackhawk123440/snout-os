/**
 * Number Release to Pool Route
 * 
 * Specific route for POST /api/numbers/[id]/release-to-pool to avoid conflict with [id] route.
 * This proxies to the NestJS API.
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

  // Get NextAuth session
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Mint API JWT token from session
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

  // Forward to API
  const apiUrl = `${API_BASE_URL}/api/numbers/${params.id}/release-to-pool`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
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

    // Transform API response to match frontend expectations
    // Frontend expects { success, impact: { affectedThreads, message } }
    // Get impact preview to get affected threads count
    let affectedThreads = 0;
    try {
      const impactResponse = await fetch(`${API_BASE_URL}/api/numbers/${params.id}/impact?action=release`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      });
      if (impactResponse.ok) {
        const impactData = await impactResponse.json();
        affectedThreads = impactData.affectedThreads || 0;
      }
    } catch (error) {
      // Ignore impact preview errors
      console.warn('[BFF Proxy] Failed to get impact preview:', error);
    }

    const transformedResponse = {
      success: true,
      impact: {
        affectedThreads,
        message: `Number released to pool. ${affectedThreads} active thread(s) affected.`,
      },
    };

    return NextResponse.json(transformedResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward release-to-pool request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
