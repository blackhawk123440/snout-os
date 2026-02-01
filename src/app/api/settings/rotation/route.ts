/**
 * Rotation Settings API
 * 
 * GET: Fetch rotation settings
 * POST: Update rotation settings
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";

const SETTINGS_KEY_PREFIX = 'rotation.';

interface RotationSettings {
  poolSelectionStrategy: 'LRU' | 'FIFO' | 'RANDOM';
  stickyReuseDays: number;
  postBookingGraceHours: number;
  inactivityReleaseDays: number;
  maxPoolThreadLifetimeDays: number;
  minPoolReserve: number;
}

const DEFAULT_SETTINGS: RotationSettings = {
  poolSelectionStrategy: 'LRU',
  stickyReuseDays: 7,
  postBookingGraceHours: 72,
  inactivityReleaseDays: 7,
  maxPoolThreadLifetimeDays: 30,
  minPoolReserve: 3,
};

async function getRotationSettings(): Promise<RotationSettings> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: SETTINGS_KEY_PREFIX,
      },
    },
  });

  const result: Partial<RotationSettings> = {};
  for (const setting of settings) {
    const key = setting.key.replace(SETTINGS_KEY_PREFIX, '') as keyof RotationSettings;
    if (key === 'poolSelectionStrategy') {
      result[key] = setting.value as 'LRU' | 'FIFO' | 'RANDOM';
    } else if (key === 'stickyReuseDays' || key === 'postBookingGraceHours' || 
               key === 'inactivityReleaseDays' || key === 'maxPoolThreadLifetimeDays' || 
               key === 'minPoolReserve') {
      result[key] = parseInt(setting.value, 10) || DEFAULT_SETTINGS[key];
    }
  }

  return { ...DEFAULT_SETTINGS, ...result };
}

async function saveRotationSettings(settings: RotationSettings): Promise<void> {
  // Upsert each setting
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: {
        key: `${SETTINGS_KEY_PREFIX}${key}`,
      },
      update: {
        value: String(value),
        category: 'rotation',
        label: key,
      },
      create: {
        key: `${SETTINGS_KEY_PREFIX}${key}`,
        value: String(value),
        category: 'rotation',
        label: key,
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

    const settings = await getRotationSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('[api/settings/rotation] GET error:', error);
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

    const body = await request.json();
    const settings: RotationSettings = {
      poolSelectionStrategy: body.poolSelectionStrategy || DEFAULT_SETTINGS.poolSelectionStrategy,
      stickyReuseDays: body.stickyReuseDays ?? DEFAULT_SETTINGS.stickyReuseDays,
      postBookingGraceHours: body.postBookingGraceHours ?? DEFAULT_SETTINGS.postBookingGraceHours,
      inactivityReleaseDays: body.inactivityReleaseDays ?? DEFAULT_SETTINGS.inactivityReleaseDays,
      maxPoolThreadLifetimeDays: body.maxPoolThreadLifetimeDays ?? DEFAULT_SETTINGS.maxPoolThreadLifetimeDays,
      minPoolReserve: body.minPoolReserve ?? DEFAULT_SETTINGS.minPoolReserve,
    };

    // Validate
    if (!['LRU', 'FIFO', 'RANDOM'].includes(settings.poolSelectionStrategy)) {
      return NextResponse.json(
        { error: "Invalid poolSelectionStrategy" },
        { status: 400 }
      );
    }

    if (settings.stickyReuseDays < 0 || settings.postBookingGraceHours < 0 || 
        settings.inactivityReleaseDays < 0 || settings.maxPoolThreadLifetimeDays < 1 || 
        settings.minPoolReserve < 0) {
      return NextResponse.json(
        { error: "Invalid numeric values" },
        { status: 400 }
      );
    }

    await saveRotationSettings(settings);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/settings/rotation] POST error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
