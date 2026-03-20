/**
 * GET  /api/client/bundles - List available bundles + client's active purchases
 * POST /api/client/bundles - Purchase a bundle
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { requireRole, requireClientContext, ForbiddenError } from "@/lib/rbac";
import { getScopedDb } from "@/lib/tenancy";

const BUNDLES_KEY = "service_bundles";
const PURCHASES_KEY = "client_bundle_purchases";

interface ServiceBundle {
  id: string;
  name: string;
  serviceType: string;
  visitCount: number;
  priceInCents: number;
  discountPercent: number;
  expirationDays: number;
  autoRenew: boolean;
  enabled: boolean;
  createdAt: string;
}

interface BundlePurchase {
  id: string;
  bundleId: string;
  clientId: string;
  remainingVisits: number;
  purchasedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "depleted";
}

async function loadBundles(db: ReturnType<typeof getScopedDb>): Promise<ServiceBundle[]> {
  const row = await db.setting.findFirst({
    where: { key: BUNDLES_KEY },
  });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadPurchases(db: ReturnType<typeof getScopedDb>): Promise<BundlePurchase[]> {
  const row = await db.setting.findFirst({
    where: { key: PURCHASES_KEY },
  });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePurchases(
  db: ReturnType<typeof getScopedDb>,
  orgId: string,
  purchases: BundlePurchase[]
): Promise<void> {
  await db.setting.upsert({
    where: { orgId_key: { orgId, key: PURCHASES_KEY } },
    create: {
      orgId,
      key: PURCHASES_KEY,
      value: JSON.stringify(purchases),
      category: "bundles",
      label: "Client Bundle Purchases",
    },
    update: {
      value: JSON.stringify(purchases),
    },
  });
}

/** Mark expired / depleted purchases so status stays accurate. */
function refreshStatuses(purchases: BundlePurchase[]): BundlePurchase[] {
  const now = new Date();
  return purchases.map((p) => {
    if (p.status === "active") {
      if (p.remainingVisits <= 0) return { ...p, status: "depleted" as const };
      if (new Date(p.expiresAt) <= now) return { ...p, status: "expired" as const };
    }
    return p;
  });
}

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, "client");
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getScopedDb(ctx);

    const [allBundles, allPurchases] = await Promise.all([
      loadBundles(db),
      loadPurchases(db),
    ]);

    const availableBundles = allBundles.filter((b) => b.enabled);
    const clientPurchases = refreshStatuses(
      allPurchases.filter((p) => p.clientId === ctx.clientId)
    );

    return NextResponse.json({
      bundles: availableBundles,
      purchases: clientPurchases,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load bundles", message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, "client");
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bundleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bundleId = typeof body.bundleId === "string" ? body.bundleId.trim() : "";
  if (!bundleId) {
    return NextResponse.json(
      { error: "Missing required field: bundleId" },
      { status: 400 }
    );
  }

  try {
    const db = getScopedDb(ctx);

    const allBundles = await loadBundles(db);
    const bundle = allBundles.find((b) => b.id === bundleId && b.enabled);
    if (!bundle) {
      return NextResponse.json(
        { error: "Bundle not found or not available" },
        { status: 404 }
      );
    }

    const allPurchases = await loadPurchases(db);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + bundle.expirationDays);

    const purchase: BundlePurchase = {
      id: globalThis.crypto.randomUUID(),
      bundleId: bundle.id,
      clientId: ctx.clientId,
      remainingVisits: bundle.visitCount,
      purchasedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "active",
    };

    allPurchases.push(purchase);
    await savePurchases(db, ctx.orgId, allPurchases);

    return NextResponse.json({ purchase, bundle }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to purchase bundle", message },
      { status: 500 }
    );
  }
}
