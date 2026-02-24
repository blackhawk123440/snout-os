# Snout OS — Master Audit

**Last updated:** Feb 24 2026

## Repo state

- **Schema:** `prisma/schema.prisma` (single source of truth; no enterprise-messaging-dashboard).
- **Messages API:** `src/app/api/messages/threads/route.ts` — typed Prisma `MessageThread` only; no proxy, no ClientContact, no `(prisma as any)`.
- **Build:** `package.json` scripts use only `prisma/schema.prisma`.
- **Personal mode:** `NEXT_PUBLIC_PERSONAL_MODE=true` for Birmingham single-org business.

## Consolidation

Diagnostic and scattered .md files have been removed; this file is the single audit reference.
