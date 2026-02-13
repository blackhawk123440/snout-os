/**
 * Connect Provider Route
 * 
 * POST /api/setup/provider/connect
 * Proxies to NestJS API for connecting provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
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

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const apiUrl = `${API_BASE_URL}/api/setup/provider/connect`;

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
      return NextResponse.json(responseData, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
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
    console.error('[BFF Proxy] Failed to forward connect provider request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
