/**
 * Health Check Endpoint
 *
 * Returns a simple 200 response for platform health checks.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'post-fix',hypothesisId:'H5',location:'src/app/api/health/route.ts:11',message:'health endpoint hit',data:{method:'GET'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'post-fix',hypothesisId:'H5',location:'src/app/api/health/route.ts:22',message:'health endpoint hit',data:{method:'HEAD'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return new Response(null, { status: 200 });
}
