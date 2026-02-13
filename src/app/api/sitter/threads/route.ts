/**
 * Sitter Threads Route
 * 
 * GET /api/sitter/threads
 * Proxies to NestJS API to get threads for the authenticated sitter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API server not configured' },
      { status: 500 }
    );
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify user is a sitter
  const user = session.user as any;
  if (!user.sitterId && user.role !== 'sitter') {
    return NextResponse.json(
      { error: 'Access denied. Sitter access required.' },
      { status: 403 }
    );
  }

  let apiToken: string;
  try {
    apiToken = await mintApiJWT({
      userId: user.id || user.email || '',
      orgId: user.orgId || 'default',
      role: user.role || 'sitter',
      sitterId: user.sitterId || null,
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to mint API JWT:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with API' },
      { status: 500 }
    );
  }

  // API endpoint: GET /api/sitter/threads
  const apiUrl = `${API_BASE_URL}/api/sitter/threads`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
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

    // API returns threads array directly
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward sitter threads request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
