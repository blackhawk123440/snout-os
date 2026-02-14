/**
 * Sitters List Route
 * 
 * GET: Proxies to NestJS API or uses Prisma directly
 * POST: Creates a new sitter using Prisma
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // Get NextAuth session
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // If API is configured, try to proxy to it
  if (API_BASE_URL) {
    try {
      // Mint API JWT token from session
      const user = session.user as any;
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId: user.orgId || 'default',
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });

      // Map to API endpoint: /api/sitters -> /api/numbers/sitters
      const apiUrl = `${API_BASE_URL}/api/numbers/sitters`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      const contentType = response.headers.get('content-type');
      let responseData: any;
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Wrap array in { sitters: [] } format expected by frontend
      const sitters = Array.isArray(responseData) ? responseData : [];
      return NextResponse.json({ sitters }, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to forward sitters request, falling back to Prisma:', error);
      // Fall through to Prisma fallback
    }
  }

  // Fallback: Use Prisma directly
  try {
    const sitters = await prisma.sitter.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform sitters to match frontend expectations
    const transformedSitters = sitters.map((sitter) => {
      const nameParts = sitter.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return {
        id: sitter.id,
        firstName,
        lastName,
        name: sitter.name,
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
      };
    });

    return NextResponse.json({ sitters: transformedSitters });
  } catch (error: any) {
    console.error('[Sitters API] Failed to fetch sitters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitters', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Get NextAuth session
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
      isActive = true,
      commissionPercentage = 80.0,
      personalPhone,
      openphonePhone,
      phoneType,
    } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName' },
        { status: 400 }
      );
    }

    // Get orgId from session
    const user = session.user as any;
    const orgId = user.orgId || 'default';

    // Combine firstName and lastName into name (schema requirement)
    const name = `${firstName} ${lastName}`.trim();

    // Create sitter using Prisma (schema only has: id, orgId, userId, name, active, createdAt, updatedAt)
    const sitter = await prisma.sitter.create({
      data: {
        orgId,
        name,
        active: isActive,
      },
    });

    // Return sitter in format expected by frontend
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
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Sitters API] Failed to create sitter:', error);
    return NextResponse.json(
      { error: 'Failed to create sitter', message: error.message },
      { status: 500 }
    );
  }
}
