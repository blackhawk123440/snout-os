/**
 * NextAuth API Route (Gate B Phase 1)
 *
 * This route provides NextAuth endpoints but does not enforce authentication
 * until feature flags are enabled.
 * Rate limited to mitigate credential stuffing / brute force.
 */

import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const id = getRateLimitIdentifier(request);
  const rl = await checkRateLimit(id, { keyPrefix: "auth", limit: 30, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const id = getRateLimitIdentifier(request);
  const rl = await checkRateLimit(id, { keyPrefix: "auth", limit: 30, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }
  return handlers.POST(request);
}

