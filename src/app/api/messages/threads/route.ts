/**
 * Threads API Proxy
 * 
 * PROXY ONLY - Forwards to NestJS API
 * This route must NOT implement backend logic.
 * All backend logic lives in the NestJS API service.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/auth-helpers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  console.error('[API Proxy] NEXT_PUBLIC_API_URL is not set. Cannot proxy to NestJS API.');
}

/**
 * GET /api/messages/threads
 * 
 * Proxies to: {API_BASE_URL}/api/threads
 */
export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API service not configured. NEXT_PUBLIC_API_URL is missing.' },
      { status: 503 }
    );
  }

  try {
    // Get session for auth
    const session = await getSessionSafe();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Forward request to NestJS API
    const searchParams = request.nextUrl.searchParams;
    const apiUrl = new URL(`${API_BASE_URL}/api/threads`);
    searchParams.forEach((value, key) => {
      apiUrl.searchParams.set(key, value);
    });

    // Generate JWT token from NextAuth session for NestJS API
    const apiToken = await generateAPIToken(session);
    if (!apiToken) {
      return NextResponse.json(
        { error: 'Failed to generate API token' },
        { status: 500 }
      );
    }

    // Forward request to NestJS API with Bearer token
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy] Error proxying to NestJS API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to API service', message: error.message },
      { status: 502 }
    );
  }
}
