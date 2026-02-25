/**
 * NextAuth API Route (Gate B Phase 1)
 * 
 * This route provides NextAuth endpoints but does not enforce authentication
 * until feature flags are enabled.
 */

import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = await handlers.GET(request);
  return response;
}

export async function POST(request: NextRequest) {
  const response = await handlers.POST(request);
  return response;
}

