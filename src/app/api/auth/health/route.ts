/**
 * NextAuth Health Check Endpoint
 * 
 * Server-only diagnostic endpoint to check NextAuth configuration.
 * Returns configuration status without exposing secrets.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export async function GET() {
  try {
    // Check if secret is present (without exposing value)
    const secretPresent = !!(process.env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET);
    const secretLength = secretPresent 
      ? (process.env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET || '').length 
      : 0;
    
    // Get NEXTAUTH_URL (mask host for security)
    // Trim whitespace/newlines (common Render issue)
    const nextAuthUrl = (process.env.NEXTAUTH_URL || env.NEXTAUTH_URL || 'NOT SET').trim();
    const maskedUrl = nextAuthUrl !== 'NOT SET' 
      ? nextAuthUrl.replace(/https?:\/\/([^/]+)/, (match, host) => {
          // Mask domain but keep protocol
          return match.replace(host, '***');
        })
      : 'NOT SET';

    // Try to get session
    let sessionResult = { hasSession: false, userRole: null as string | null, error: null as string | null };
    try {
      const session = await auth();
      if (session?.user) {
        sessionResult.hasSession = true;
        sessionResult.userRole = (session.user as any).role || 'unknown';
      }
    } catch (error: any) {
      sessionResult.error = error?.message || 'Unknown error';
    }

    return NextResponse.json({
      status: 'ok',
      env: {
        NEXTAUTH_URL: maskedUrl,
        NEXTAUTH_URL_RAW: nextAuthUrl,
        NEXTAUTH_SECRET_PRESENT: secretPresent,
        NEXTAUTH_SECRET_LENGTH: secretLength,
        NEXTAUTH_SECRET_VALID: secretLength >= 32,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
        JWT_SECRET_PRESENT: !!(process.env.JWT_SECRET),
        DATABASE_URL_PRESENT: !!(process.env.DATABASE_URL),
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      },
      providers: ['credentials'],
      canReadSession: sessionResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
