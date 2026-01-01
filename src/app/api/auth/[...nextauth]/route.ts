/**
 * NextAuth API Route (Gate B Phase 1)
 * 
 * This route provides NextAuth endpoints but does not enforce authentication
 * until feature flags are enabled.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

