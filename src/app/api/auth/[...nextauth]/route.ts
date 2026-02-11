/**
 * NextAuth API Route (Gate B Phase 1)
 * 
 * This route provides NextAuth endpoints but does not enforce authentication
 * until feature flags are enabled.
 */

import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

const hasSessionCookie = (cookieHeader: string | null) => {
  if (!cookieHeader) return false;
  return (
    cookieHeader.includes("next-auth.session-token") ||
    cookieHeader.includes("__Secure-next-auth.session-token")
  );
};

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const response = await handlers.GET(request);
  const setCookie = response.headers.get("set-cookie");
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'auth-debug-pre',hypothesisId:'H2',location:'src/app/api/auth/[...nextauth]/route.ts:20',message:'NextAuth GET',data:{pathname:request.nextUrl.pathname,host:request.headers.get("host"),hasSessionCookie:hasSessionCookie(cookieHeader),setCookiePresent:!!setCookie},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return response;
}

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const response = await handlers.POST(request);
  const setCookie = response.headers.get("set-cookie");
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'auth-debug-pre',hypothesisId:'H2',location:'src/app/api/auth/[...nextauth]/route.ts:32',message:'NextAuth POST',data:{pathname:request.nextUrl.pathname,host:request.headers.get("host"),hasSessionCookie:hasSessionCookie(cookieHeader),setCookiePresent:!!setCookie},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return response;
}

