/**
 * Chaos Mode API
 * 
 * Staging-only toggle to simulate production failures:
 * - Duplicate messages
 * - Delayed delivery
 * - Random failures
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const CHAOS_MODE_KEY = 'ops.chaosMode';
const CHAOS_MODE_ENABLED_KEY = 'ops.chaosMode.enabled';

interface ChaosModeSettings {
  enabled: boolean;
  duplicateProbability: number; // 0-1
  delayProbability: number; // 0-1
  delayMs: number;
  failureProbability: number; // 0-1
  failureRate: number; // 0-1, percentage of requests that fail
}

const DEFAULT_CHAOS_SETTINGS: ChaosModeSettings = {
  enabled: false,
  duplicateProbability: 0.1,
  delayProbability: 0.2,
  delayMs: 1000,
  failureProbability: 0.05,
  failureRate: 0.1,
};

async function getChaosModeSettings(): Promise<ChaosModeSettings> {
  // Only allow in staging/dev
  if (env.NODE_ENV === 'production' && !env.ALLOW_CHAOS_MODE) {
    return { ...DEFAULT_CHAOS_SETTINGS, enabled: false };
  }

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: 'ops.chaosMode.',
      },
    },
  });

  const result: Partial<ChaosModeSettings> = {};
  for (const setting of settings) {
    const key = setting.key.replace('ops.chaosMode.', '') as keyof ChaosModeSettings;
    if (key === 'enabled') {
      result[key] = setting.value === 'true';
    } else if (typeof DEFAULT_CHAOS_SETTINGS[key] === 'number') {
      result[key] = parseFloat(setting.value) || DEFAULT_CHAOS_SETTINGS[key];
    }
  }

  return { ...DEFAULT_CHAOS_SETTINGS, ...result };
}

async function saveChaosModeSettings(settings: ChaosModeSettings): Promise<void> {
  // Only allow in staging/dev
  if (env.NODE_ENV === 'production' && !env.ALLOW_CHAOS_MODE) {
    throw new Error('Chaos mode is not allowed in production');
  }

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: {
        key: `ops.chaosMode.${key}`,
      },
      update: {
        value: String(value),
        category: 'ops',
        label: `Chaos Mode: ${key}`,
      },
      create: {
        key: `ops.chaosMode.${key}`,
        value: String(value),
        category: 'ops',
        label: `Chaos Mode: ${key}`,
      },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can view chaos mode settings
    // In a real system, you'd check user role here
    const settings = await getChaosModeSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('[api/ops/chaos-mode] GET error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can modify chaos mode settings
    // In a real system, you'd check user role here

    const body = await request.json();
    const settings: ChaosModeSettings = {
      enabled: body.enabled ?? DEFAULT_CHAOS_SETTINGS.enabled,
      duplicateProbability: body.duplicateProbability ?? DEFAULT_CHAOS_SETTINGS.duplicateProbability,
      delayProbability: body.delayProbability ?? DEFAULT_CHAOS_SETTINGS.delayProbability,
      delayMs: body.delayMs ?? DEFAULT_CHAOS_SETTINGS.delayMs,
      failureProbability: body.failureProbability ?? DEFAULT_CHAOS_SETTINGS.failureProbability,
      failureRate: body.failureRate ?? DEFAULT_CHAOS_SETTINGS.failureRate,
    };

    // Validate
    if (settings.duplicateProbability < 0 || settings.duplicateProbability > 1 ||
        settings.delayProbability < 0 || settings.delayProbability > 1 ||
        settings.failureProbability < 0 || settings.failureProbability > 1 ||
        settings.failureRate < 0 || settings.failureRate > 1 ||
        settings.delayMs < 0) {
      return NextResponse.json(
        { error: "Invalid chaos mode settings" },
        { status: 400 }
      );
    }

    await saveChaosModeSettings(settings);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/ops/chaos-mode] POST error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Apply chaos mode effects to a message send operation
 */
export async function applyChaosMode(
  operation: 'send' | 'webhook' | 'routing'
): Promise<{ shouldFail: boolean; delayMs: number; shouldDuplicate: boolean }> {
  const settings = await getChaosModeSettings();
  
  if (!settings.enabled) {
    return { shouldFail: false, delayMs: 0, shouldDuplicate: false };
  }

  const shouldFail = Math.random() < settings.failureProbability;
  const delayMs = Math.random() < settings.delayProbability ? settings.delayMs : 0;
  const shouldDuplicate = Math.random() < settings.duplicateProbability;

  return { shouldFail, delayMs, shouldDuplicate };
}
