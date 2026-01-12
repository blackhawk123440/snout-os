/**
 * Automations API - List and Create
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const automations = await prisma.automation.findMany({
      include: {
        trigger: true,
        runs: {
          take: 1,
          orderBy: { triggeredAt: 'desc' },
        },
        _count: {
          select: { runs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ automations });
  } catch (error: any) {
    console.error('Failed to fetch automations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch automations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, triggerType, triggerConfig } = body;

    const automation = await prisma.automation.create({
      data: {
        name,
        description,
        status: 'draft',
        isEnabled: false,
        trigger: {
          create: {
            triggerType,
            triggerConfig: JSON.stringify(triggerConfig || {}),
          },
        },
      },
      include: {
        trigger: true,
      },
    });

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error('Failed to create automation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create automation' },
      { status: 500 }
    );
  }
}
