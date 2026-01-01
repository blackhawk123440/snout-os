/**
 * Public Routes Allowlist (Gate B Phase 1)
 * 
 * Defines which routes must always remain publicly accessible,
 * even when auth protection is enabled.
 */

/**
 * Check if a path matches any public route pattern
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    // Booking form submission (must remain public)
    "/api/form",
    
    // Stripe webhook (must remain public, but will be validated)
    "/api/webhooks/stripe",
    
    // SMS webhook (must remain public, but will be validated)
    "/api/webhooks/sms",
    
    // Health check (public for monitoring)
    "/api/health",
    
    // Payment return/confirmation pages (must remain public)
    "/tip/", // All tip payment pages
    "/tip/success",
    "/tip/payment",
    "/tip/cancel",
    "/tip/link-builder", // Tip link builder (public)
    "/tip/t/", // Tip redirect route (public)
    "/tip/[amount]/[sitter]", // Dynamic tip routes
    
    // Static booking form (served from public directory)
    "/booking-form.html",
    
    // NextAuth routes (must be public for auth to work)
    "/api/auth/",
  ];

  // Exact match
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // Prefix match for paths that start with these patterns
  for (const route of publicRoutes) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }

  // NextAuth routes pattern
  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  return false;
}

