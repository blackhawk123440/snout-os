/**
 * NextAuth Configuration Check Endpoint
 * 
 * Diagnostic endpoint to check if NextAuth is properly configured.
 * This helps identify missing environment variables.
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const checks = {
    NEXTAUTH_SECRET: {
      set: !!env.NEXTAUTH_SECRET,
      value: env.NEXTAUTH_SECRET ? '***SET***' : 'NOT SET',
      required: true,
    },
    NEXTAUTH_URL: {
      set: !!env.NEXTAUTH_URL,
      value: env.NEXTAUTH_URL || 'NOT SET',
      required: true,
    },
    DATABASE_URL: {
      set: !!env.DATABASE_URL,
      value: env.DATABASE_URL ? '***SET***' : 'NOT SET',
      required: true,
    },
  };

  const allRequiredSet = Object.values(checks).every(check => check.set || !check.required);
  const missing = Object.entries(checks)
    .filter(([_, check]) => check.required && !check.set)
    .map(([key, _]) => key);

  return NextResponse.json({
    status: allRequiredSet ? 'ok' : 'error',
    message: allRequiredSet 
      ? 'All required environment variables are set'
      : `Missing required environment variables: ${missing.join(', ')}`,
    checks,
    instructions: !allRequiredSet ? {
      action: 'Add missing environment variables in Render Dashboard',
      steps: [
        '1. Go to: https://dashboard.render.com',
        '2. Select your service: snout-os-staging',
        '3. Go to Environment tab',
        '4. Add the missing variables listed above',
        '5. Save changes (triggers redeploy)',
      ],
      values: {
        NEXTAUTH_SECRET: 'KKHCGgsajwdE5jkpbJj6I9zX3r/qwb9ScqLHN1pcf9I=',
        NEXTAUTH_URL: 'https://snout-os-staging.onrender.com',
      },
    } : null,
  }, {
    status: allRequiredSet ? 200 : 500,
  });
}
