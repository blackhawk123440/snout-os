/**
 * NextAuth API Route (Gate B Phase 1)
 * 
 * This route provides NextAuth endpoints but does not enforce authentication
 * until feature flags are enabled.
 */

import { handlers } from "@/lib/auth";
import { NextResponse } from "next/server";

// Wrap handlers to catch errors and provide better error messages
export async function GET(request: Request) {
  try {
    const handler = handlers.GET;
    return await handler(request);
  } catch (error: any) {
    console.error('[NextAuth] GET error:', error);
    // Check if it's a missing secret error
    if (error?.message?.includes('secret') || error?.message?.includes('NEXTAUTH_SECRET')) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: 'NEXTAUTH_SECRET is not set. Please set it in your environment variables.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Authentication error', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const handler = handlers.POST;
    return await handler(request);
  } catch (error: any) {
    console.error('[NextAuth] POST error:', error);
    // Check if it's a missing secret error
    if (error?.message?.includes('secret') || error?.message?.includes('NEXTAUTH_SECRET')) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: 'NEXTAUTH_SECRET is not set. Please set it in your environment variables.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Authentication error', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

