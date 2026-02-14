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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    const sitter = await prisma.sitter.findUnique({
      where: { id: resolvedParams.id },
    }) as any; // Type assertion: runtime uses enterprise-messaging-dashboard schema (name field)

    if (!sitter) {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
      );
    }

    // Return sitter in format expected by frontend
    const nameParts = (sitter.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return NextResponse.json({ 
      sitter: {
        id: sitter.id,
        firstName,
        lastName,
        name: sitter.name || '',
        phone: null,
        email: null,
        personalPhone: null,
        openphonePhone: null,
        phoneType: null,
        isActive: sitter.active,
        commissionPercentage: 80.0,
        createdAt: sitter.createdAt,
        updatedAt: sitter.updatedAt,
        currentTier: null,
      }
    });
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    const body = await request.json();
    const {
      firstName: bodyFirstName,
      lastName: bodyLastName,
      phone,
      email,
      isActive,
      commissionPercentage,
      personalPhone,
      openphonePhone,
      phoneType,
    } = body;

    // Build update data object (only include fields that exist in schema)
    const updateData: any = {};
    
    // Schema only has: id, orgId, userId, name, active, createdAt, updatedAt
    if (bodyFirstName !== undefined || bodyLastName !== undefined) {
      // Combine firstName and lastName into name
      const existingSitter = await prisma.sitter.findUnique({
        where: { id: resolvedParams.id },
      }) as any; // Type assertion: runtime uses enterprise-messaging-dashboard schema
      
      if (bodyFirstName !== undefined && bodyLastName !== undefined) {
        updateData.name = `${bodyFirstName} ${bodyLastName}`.trim();
      } else if (bodyFirstName !== undefined && existingSitter) {
        // Only firstName provided, combine with existing lastName
        const existingName = (existingSitter.name || '').split(' ');
        const existingLastName = existingName.slice(1).join(' ') || '';
        updateData.name = `${bodyFirstName} ${existingLastName}`.trim();
      } else if (bodyLastName !== undefined && existingSitter) {
        // Only lastName provided, combine with existing firstName
        const existingName = (existingSitter.name || '').split(' ');
        const existingFirstName = existingName[0] || '';
        updateData.name = `${existingFirstName} ${bodyLastName}`.trim();
      }
    }
    
    if (isActive !== undefined) {
      updateData.active = isActive;
    }

    const sitter = await prisma.sitter.update({
      where: { id: resolvedParams.id },
      data: updateData as any, // Type assertion: runtime uses enterprise-messaging-dashboard schema
    }) as any;

    // Return sitter in format expected by frontend
    const nameParts = (sitter.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return NextResponse.json({ 
      sitter: {
        id: sitter.id,
        firstName,
        lastName,
        name: sitter.name,
        phone: phone || null,
        email: email || null,
        personalPhone: personalPhone || null,
        openphonePhone: openphonePhone || null,
        phoneType: phoneType || null,
        isActive: sitter.active,
        commissionPercentage: commissionPercentage || 80.0,
        createdAt: sitter.createdAt,
        updatedAt: sitter.updatedAt,
        currentTier: null,
      }
    });
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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    await prisma.sitter.delete({
      where: { id: resolvedParams.id },
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
