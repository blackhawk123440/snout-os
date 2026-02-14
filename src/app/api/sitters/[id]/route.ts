/**
 * Sitter Detail Route
 * 
 * GET: Get sitter by ID
 * PATCH: Update sitter
 * DELETE: Delete sitter
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const sitter = await prisma.sitter.findUnique({
      where: { id: params.id },
      include: {
        currentTier: true,
      },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sitter });
  } catch (error: any) {
    console.error('[Sitters API] Failed to fetch sitter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitter', message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      isActive,
      commissionPercentage,
      personalPhone,
      openphonePhone,
      phoneType,
    } = body;

    // Build update data object (only include fields that are provided)
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (isActive !== undefined) updateData.active = isActive;
    if (commissionPercentage !== undefined) updateData.commissionPercentage = parseFloat(commissionPercentage) || 80.0;
    if (personalPhone !== undefined) updateData.personalPhone = personalPhone || null;
    if (openphonePhone !== undefined) updateData.openphonePhone = openphonePhone || null;
    if (phoneType !== undefined) updateData.phoneType = phoneType || null;

    const sitter = await prisma.sitter.update({
      where: { id: params.id },
      data: updateData,
      include: {
        currentTier: true,
      },
    });

    return NextResponse.json({ sitter });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
      );
    }
    console.error('[Sitters API] Failed to update sitter:', error);
    return NextResponse.json(
      { error: 'Failed to update sitter', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await prisma.sitter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
      );
    }
    console.error('[Sitters API] Failed to delete sitter:', error);
    return NextResponse.json(
      { error: 'Failed to delete sitter', message: error.message },
      { status: 500 }
    );
  }
}
