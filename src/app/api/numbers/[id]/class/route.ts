/**
 * Change Number Class Route
 * 
 * PATCH /api/numbers/[id]/class
 * Proxies to NestJS API to change number class.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function PATCH(
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

  let body: { class: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const apiUrl = `${API_BASE_URL}/api/numbers/${numberId}/class`;

  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
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
    // Transform to match frontend schema: { success: boolean, number: Number }
    if (!responseData || typeof responseData !== 'object') {
      console.error('[BFF Proxy] Invalid API response format:', responseData);
      return NextResponse.json(
        { error: 'Invalid API response format' },
        { status: 500 }
      );
    }

    // Ensure assignedSitter is properly formatted (nullable)
    const transformedNumber = {
      ...responseData,
      assignedSitter: responseData.assignedSitter || null,
    };

    return NextResponse.json({
      success: true,
      number: transformedNumber,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward change class request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
