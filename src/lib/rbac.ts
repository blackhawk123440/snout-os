import type { AppRole, RequestContext } from "@/lib/request-context";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireRole(ctx: RequestContext, role: AppRole): void {
  if (ctx.role !== role) {
    throw new ForbiddenError();
  }
}

export function requireAnyRole(ctx: RequestContext, roles: AppRole[]): void {
  if (!roles.includes(ctx.role)) {
    throw new ForbiddenError();
  }
}
