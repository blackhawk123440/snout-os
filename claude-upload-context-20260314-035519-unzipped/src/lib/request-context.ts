import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getRuntimeEnvName } from "@/lib/runtime-env";

export type AppRole = "owner" | "admin" | "sitter" | "client" | "public";

export interface RequestContext {
  orgId: string;
  role: AppRole;
  userId: string | null;
  sitterId: string | null;
  clientId: string | null;
}

export interface PublicBookingStagingStatus {
  runtime: string;
  enabled: boolean;
  configured: boolean;
  requestHost: string;
  orgId: string | null;
  reason: string | null;
}

const normalizeRole = (role: unknown): AppRole => {
  const value = String(role || "").toLowerCase();
  if (value === "owner" || value === "admin" || value === "sitter" || value === "client") {
    return value;
  }
  return "public";
};

const getLockedOrgId = () => env.PERSONAL_ORG_ID || "default";
const REQUEST_CONTEXT_FAST_PATH = process.env.REQUEST_CONTEXT_FAST_PATH === "true";

export const isPersonalMode = () => env.NEXT_PUBLIC_PERSONAL_MODE === true;
let loggedPublicBookingStatus = false;

export async function getRequestContext(): Promise<RequestContext> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = typeof (session.user as Record<string, unknown>).id === "string"
    ? (session.user as Record<string, unknown>).id as string
    : null;

  const user = session.user as Record<string, unknown>;
  const sessionRole = normalizeRole(user.role);
  const sessionOrgId = typeof user.orgId === "string" ? user.orgId.trim() : "";
  const canFastPath = REQUEST_CONTEXT_FAST_PATH && userId && sessionRole !== "public" && !!sessionOrgId;

  let dbUser: { deletedAt: Date | null; role: string | null; orgId: string | null } | null = null;
  if (userId && !canFastPath) {
    dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, role: true, orgId: true },
    });
    if (dbUser?.deletedAt) {
      throw new Error("Account has been deleted");
    }
  }

  let role = normalizeRole(user.role);
  const sitterId = typeof user.sitterId === "string" ? user.sitterId : null;
  const clientId = typeof user.clientId === "string" ? user.clientId : null;
  // Staging/legacy: resolve role from DB when session has no role so owner/admin always get access
  if (role === "public" && dbUser?.role) {
    const dbRole = normalizeRole(dbUser.role);
    if (dbRole === "owner" || dbRole === "admin") role = dbRole;
  }
  if (role === "public" && userId && !sitterId && !clientId) role = "owner";

  if (isPersonalMode()) {
    return {
      orgId: getLockedOrgId(),
      role,
      userId,
      sitterId,
      clientId,
    };
  }

  let orgId = typeof user.orgId === "string" ? user.orgId.trim() : "";
  if (!orgId && dbUser?.orgId && String(dbUser.orgId).trim()) orgId = String(dbUser.orgId).trim();
  if (!orgId) orgId = "default";

  return {
    orgId,
    role,
    userId,
    sitterId,
    clientId,
  };
}

export function getPublicOrgContext(requestHost?: string): RequestContext {
  if (!isPersonalMode()) {
    const status = getPublicBookingStagingStatus(requestHost);
    if (!loggedPublicBookingStatus) {
      loggedPublicBookingStatus = true;
      console.info(
        `[Public Booking] runtime=${status.runtime} enabled=${status.enabled} configured=${status.configured} host=${status.requestHost || "(none)"} orgId=${status.orgId ?? "(none)"} reason=${status.reason ?? "ok"}`
      );
    }
    if (!status.enabled || !status.configured || !status.orgId) {
      throw new Error("Public booking is disabled in SaaS mode until org binding is configured");
    }
    return {
      orgId: status.orgId,
      role: "public",
      userId: null,
      sitterId: null,
      clientId: null,
    };
  }

  return {
    orgId: getLockedOrgId(),
    role: "public",
    userId: null,
    sitterId: null,
    clientId: null,
  };
}

export function getPublicBookingStagingStatus(requestHost?: string): PublicBookingStagingStatus {
  const runtime = getRuntimeEnvName();
  const enabled = runtime === "staging" && process.env.ENABLE_PUBLIC_BOOKING_STAGING === "true";
  const requestHostLower = String(requestHost || "").toLowerCase();
  const bindings = String(process.env.PUBLIC_BOOKING_STAGING_ORG_BINDINGS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, orgId] = entry.split("=").map((part) => part.trim());
      return { host: host?.toLowerCase(), orgId: orgId || null };
    })
    .filter((entry) => !!entry.host && !!entry.orgId);
  const binding = bindings.find((entry) => entry.host === requestHostLower);
  if (!enabled) {
    return {
      runtime,
      enabled: false,
      configured: bindings.length > 0,
      requestHost: requestHostLower,
      orgId: null,
      reason: "ENABLE_PUBLIC_BOOKING_STAGING must be true in staging",
    };
  }
  if (bindings.length === 0) {
    return {
      runtime,
      enabled: true,
      configured: false,
      requestHost: requestHostLower,
      orgId: null,
      reason: "PUBLIC_BOOKING_STAGING_ORG_BINDINGS is empty",
    };
  }
  if (!binding?.orgId) {
    return {
      runtime,
      enabled: true,
      configured: false,
      requestHost: requestHostLower,
      orgId: null,
      reason: "request host is not bound to a staging org",
    };
  }
  return {
    runtime,
    enabled: true,
    configured: true,
    requestHost: requestHostLower,
    orgId: binding.orgId,
    reason: null,
  };
}
