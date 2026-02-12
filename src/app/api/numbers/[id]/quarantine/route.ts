/**
 * Number Quarantine Route
 * 
 * Specific route for POST /api/numbers/[id]/quarantine to avoid conflict with [id] route.
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

  // Read request body
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Forward to API
  const apiUrl = `${API_BASE_URL}/api/numbers/${params.id}/quarantine`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body,
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
    }

    // Transform API response to match frontend expectations
    // API returns the updated number object, but frontend expects { success, impact }
    if (response.ok && responseData) {
      // Get impact preview from API to get affected threads count
      let affectedThreads = 0;
      try {
        const impactResponse = await fetch(`${API_BASE_URL}/api/numbers/${params.id}/impact?action=quarantine`, {
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
        // Ignore impact preview errors, use default
        console.warn('[BFF Proxy] Failed to get impact preview:', error);
      }

      const releaseAt = responseData.quarantineReleaseAt 
        ? new Date(responseData.quarantineReleaseAt).toISOString()
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const transformedResponse = {
        success: true,
        impact: {
          affectedThreads,
          cooldownDays: 90,
          releaseAt,
          message: `Number quarantined. ${affectedThreads} active thread(s) will be routed to owner inbox. Will be released in 90 days.`,
        },
      };
      return NextResponse.json(transformedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward quarantine request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
