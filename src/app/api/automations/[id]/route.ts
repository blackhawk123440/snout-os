/**
 * Automation Detail API - Get, Update, Delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const automation = await prisma.automation.findUnique({
      where: { id },
      include: {
        trigger: true,
        conditionGroups: {
          include: {
            conditions: true,
          },
          orderBy: { order: 'asc' },
        },
        actions: {
          orderBy: { order: 'asc' },
        },
        templates: true,
        runs: {
          take: 10,
          orderBy: { triggeredAt: 'desc' },
          include: {
            steps: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error('Failed to fetch automation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch automation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const automation = await prisma.automation.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.status && { status: body.status }),
        ...(body.version && { version: body.version }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ automation });
  } catch (error: any) {
    console.error('Failed to update automation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update automation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.automation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete automation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete automation' },
      { status: 500 }
    );
  }
}
