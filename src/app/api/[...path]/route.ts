/**
 * BFF Proxy Route Handler
 * 
 * Proxies all API requests from the frontend to the NestJS API.
 * Converts NextAuth session cookies to API JWT tokens for authentication.
 * 
 * This is a thin proxy layer - NO business logic, only auth translation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  console.error('[BFF Proxy] NEXT_PUBLIC_API_URL not set - proxy will fail');
}

/**
 * Proxy handler for all API routes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params, 'DELETE');
}

async function handleProxyRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  // Skip NextAuth routes - they are handled by NextAuth directly
  const path = params.path.join('/');
  if (path.startsWith('auth/')) {
    // This shouldn't happen due to Next.js route priority, but safety check
    return NextResponse.json(
      { error: 'NextAuth routes are not proxied' },
      { status: 404 }
    );
  }

  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API server not configured' },
      { status: 500 }
    );
  }

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

  // Reconstruct the API path
  const apiPath = `/${params.path.join('/')}`;
  
  // Preserve query string
  const searchParams = request.nextUrl.searchParams.toString();
  const apiUrl = `${API_BASE_URL}${apiPath}${searchParams ? `?${searchParams}` : ''}`;

  // Read request body if present
  let body: string | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  // Forward request to API
  try {
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        // Forward any additional headers if needed
        ...(request.headers.get('accept') && { 'Accept': request.headers.get('accept')! }),
      },
      body,
    });

    // Get response body
    const contentType = response.headers.get('content-type');
    let responseData: any;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Forward response with same status and headers
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[BFF Proxy] Failed to forward request:', error);
    return NextResponse.json(
      { error: 'Failed to reach API server', message: error.message },
      { status: 502 }
    );
  }
}
