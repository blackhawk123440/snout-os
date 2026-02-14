/**
 * Build Info Endpoint
 * 
 * GET /api/ops/build
 * 
 * Returns build information (git SHA, build time) as fallback
 * when env vars are not available.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    gitSha: process.env.NEXT_PUBLIC_GIT_SHA || 
            process.env.GIT_SHA || 
            process.env.VERCEL_GIT_COMMIT_SHA ||
            process.env.RENDER_GIT_COMMIT ||
            'unknown',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 
               process.env.BUILD_TIME ||
               new Date().toISOString(),
  });
}
