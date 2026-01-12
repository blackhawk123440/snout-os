/**
 * Automations Stats API
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEnabled, runsToday, failuresToday] = await Promise.all([
      prisma.automation.count({
        where: { isEnabled: true, status: 'active' },
      }),
      prisma.automationRun.count({
        where: {
          triggeredAt: { gte: today },
          status: { in: ['success', 'failed', 'running'] },
        },
      }),
      prisma.automationRun.count({
        where: {
          triggeredAt: { gte: today },
          status: 'failed',
        },
      }),
    ]);

    return NextResponse.json({
      totalEnabled,
      runsToday,
      failuresToday,
    });
  } catch (error: any) {
    console.error('Failed to fetch automation stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
