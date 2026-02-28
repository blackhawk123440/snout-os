import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export type AppRole = "owner" | "admin" | "sitter" | "client" | "public";

export interface RequestContext {
  orgId: string;
  role: AppRole;
  userId: string | null;
  sitterId: string | null;
  clientId: string | null;
}

const normalizeRole = (role: unknown): AppRole => {
  const value = String(role || "").toLowerCase();
  if (value === "owner" || value === "admin" || value === "sitter" || value === "client") {
    return value;
  }
  return "public";
};

const getLockedOrgId = () => env.PERSONAL_ORG_ID || "default";

export const isPersonalMode = () => env.NEXT_PUBLIC_PERSONAL_MODE === true;

export async function getRequestContext(): Promise<RequestContext> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = session.user as Record<string, unknown>;
  const role = normalizeRole(user.role);
  const userId = typeof user.id === "string" ? user.id : null;
  const sitterId = typeof user.sitterId === "string" ? user.sitterId : null;
  const clientId = typeof user.clientId === "string" ? user.clientId : null;

  if (isPersonalMode()) {
    return {
      orgId: getLockedOrgId(),
      role,
      userId,
      sitterId,
      clientId,
    };
  }

  const orgId = typeof user.orgId === "string" ? user.orgId : "";
  if (!orgId) {
    throw new Error("Organization context missing");
  }

  return {
    orgId,
    role,
    userId,
    sitterId,
    clientId,
  };
}

export function getPublicOrgContext(): RequestContext {
  if (!isPersonalMode()) {
    throw new Error("Public booking is disabled in SaaS mode until org binding is configured");
  }

  return {
    orgId: getLockedOrgId(),
    role: "public",
    userId: null,
    sitterId: null,
    clientId: null,
  };
}
