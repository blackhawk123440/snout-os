import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Add any middleware logic here
  // For example, authentication checks, rate limiting, etc.
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};