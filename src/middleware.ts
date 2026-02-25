/**
 * Middleware (Gate B Phase 2.1)
 * 
 * Authentication middleware. Enforces authentication on protected routes
 * when ENABLE_AUTH_PROTECTION feature flag is set to true.
 */

import { NextRequest, NextResponse } from "next/server";
import { isPublicRoute } from "@/lib/public-routes";
import { isProtectedRoute } from "@/lib/protected-routes";
import { isSitterRoute, isSitterRestrictedRoute } from "@/lib/sitter-routes";
import { env } from "@/lib/env";
import { getSessionSafe } from "@/lib/auth-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Phase 2: Role separation enforcement - ALWAYS ENABLED for production
  // Feature flags can disable for development, but default to enabled
  const enableAuthProtection = env.ENABLE_AUTH_PROTECTION !== false; // Default true unless explicitly false
  const enableSitterAuth = env.ENABLE_SITTER_AUTH !== false; // Default true unless explicitly false
  const enablePermissionChecks = env.ENABLE_PERMISSION_CHECKS !== false; // Default true unless explicitly false

  // Phase 5.1: If sitter auth is enabled, check sitter restrictions first
  if (enableSitterAuth) {
    // Get session to check role
    const session = await getSessionSafe();
    
    // Check if user is a sitter (has sitterId in session or role === 'sitter')
    const isSitter = session?.user && (
      (session.user as any).sitterId || 
      (session.user as any).role === 'sitter'
    );
    
    // If user is authenticated as a sitter, enforce sitter restrictions
    if (isSitter) {
      // Per Master Spec 7.1.2: Sitters cannot access restricted routes
      if (isSitterRestrictedRoute(pathname)) {
        // Redirect /messages to /sitter/inbox (UI route)
        if (pathname.startsWith('/messages')) {
          return NextResponse.redirect(new URL('/sitter/inbox', request.url));
        }
        // Other restricted routes return 403
        return NextResponse.json(
          { error: "Access denied: This route is not available to sitters" },
          { status: 403 }
        );
      }
      
      // Allow sitter routes to proceed (they will be checked in API routes)
      if (isSitterRoute(pathname)) {
        return NextResponse.next();
      }
    }
  }

  // If auth protection is disabled, allow all requests (current behavior)
  if (!enableAuthProtection) {
    return NextResponse.next();
  }

  // Auth protection is enabled - check if route is public first
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if route is protected
  if (isProtectedRoute(pathname)) {
    // Phase 2.2: Check for valid session
    const session = await getSessionSafe();
    
    if (!session) {
      // No session - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Session exists - allow request to proceed
    return NextResponse.next();
  }

  // Route is neither public nor protected - allow it
  // This handles routes that don't need protection (e.g., static assets handled by Next.js)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};