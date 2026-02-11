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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H4',location:'src/app/api/auth/health/route.ts:41',message:'auth health computed',data:{secretPresent,secretLength,secretValid:secretLength >= 32,nextAuthUrlSet:nextAuthUrl !== 'NOT SET',nodeEnv:process.env.NODE_ENV || 'NOT SET',nextPublicApiUrlSet:!!process.env.NEXT_PUBLIC_API_URL,sessionHasUser:sessionResult.hasSession,sessionError:sessionResult.error},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H4',location:'src/app/api/auth/health/route.ts:60',message:'auth health error',data:{error:error?.message || 'Unknown error'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      status: 'error',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
