/**
 * Assignment Windows API Proxy
 * 
 * PROXY ONLY - Forwards to NestJS API
 * GET /api/assignments/windows
 * POST /api/assignments/windows
 * Proxies to: {API_BASE_URL}/api/assignments/windows
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/auth-helpers";
import { generateAPIToken } from "@/lib/api/proxy-auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API service not configured. NEXT_PUBLIC_API_URL is missing.' },
      { status: 503 }
    );
  }

  try {
    const session = await getSessionSafe();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const apiUrl = new URL(`${API_BASE_URL}/api/assignments/windows`);
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

export async function POST(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { error: 'API service not configured. NEXT_PUBLIC_API_URL is missing.' },
      { status: 503 }
    );
  }

  try {
    const session = await getSessionSafe();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Generate JWT token from NextAuth session for NestJS API
    const apiToken = await generateAPIToken(session);
    if (!apiToken) {
      return NextResponse.json(
        { error: 'Failed to generate API token' },
        { status: 500 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/assignments/windows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
