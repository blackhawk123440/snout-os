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
      { 
        status: 401,
        headers: {
          'X-Snout-Api': 'sitters-route-hit',
          'X-Snout-Auth': 'missing-session',
        },
      }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';
  
  // Fail loudly if orgId is missing in staging
  if (process.env.NODE_ENV === 'production' && (!user.orgId || user.orgId === 'default')) {
    return NextResponse.json(
      { error: 'Organization ID missing. Please contact support.', details: 'orgId is required but was not found in session.' },
      { 
        status: 401,
        headers: {
          'X-Snout-Api': 'sitters-route-hit',
          'X-Snout-Auth': 'missing-orgid',
          'X-Snout-OrgId': 'missing',
        },
      }
    );
  }

  // If API is configured, try to proxy to it
  if (API_BASE_URL) {
    try {
      // Mint API JWT token from session
      // (user and orgId already declared above)
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
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

      if (!response.ok) {
        // If API returns error, fall through to Prisma fallback
        throw new Error(`API returned ${response.status}: ${JSON.stringify(responseData)}`);
      }

      // API may return array or { sitters: [...] } - normalize to array
      let sitters: any[] = [];
      if (Array.isArray(responseData)) {
        sitters = responseData;
      } else if (responseData.sitters && Array.isArray(responseData.sitters)) {
        sitters = responseData.sitters;
      }

      // If backend API doesn't include assignedNumberId, fetch it from Prisma
      // (user and orgId already declared above)
      const sitterIds = sitters.map((s: any) => s.id).filter(Boolean);
      
      let numberMap = new Map<string, string>();
      if (sitterIds.length > 0) {
        try {
          const assignedNumbers = await (prisma as any).messageNumber.findMany({
            where: {
              orgId,
              assignedSitterId: { in: sitterIds },
              class: 'sitter',
              status: 'active',
            },
            select: {
              id: true,
              assignedSitterId: true,
            },
          });
          assignedNumbers.forEach((num: any) => {
            if (num.assignedSitterId) {
              numberMap.set(num.assignedSitterId, num.id);
            }
          });
        } catch (error) {
          console.warn('[BFF Proxy] Failed to fetch assigned numbers:', error);
          // Continue without assignedNumberId - not critical
        }
      }

      // Transform to match frontend expectations
      const transformedSitters = sitters.map((sitter: any) => ({
        id: sitter.id,
        firstName: sitter.firstName || (sitter.name ? sitter.name.split(' ')[0] : ''),
        lastName: sitter.lastName || (sitter.name ? sitter.name.split(' ').slice(1).join(' ') : ''),
        name: sitter.name || `${sitter.firstName || ''} ${sitter.lastName || ''}`.trim(),
        phone: sitter.phone || null,
        email: sitter.email || null,
        personalPhone: sitter.personalPhone || null,
        isActive: sitter.isActive ?? sitter.active ?? true,
        commissionPercentage: sitter.commissionPercentage || 80.0,
        createdAt: sitter.createdAt,
        updatedAt: sitter.updatedAt,
        currentTier: sitter.currentTier || null,
        assignedNumberId: sitter.assignedNumberId || numberMap.get(sitter.id) || null,
      }));

      return NextResponse.json({ sitters: transformedSitters }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Snout-Api': 'sitters-route-hit',
          'X-Snout-Route': 'proxy',
          'X-Snout-OrgId': orgId,
        },
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to forward sitters request, falling back to Prisma:', error);
      // Fall through to Prisma fallback
    }
  }

  // Fallback: Use Prisma directly
  try {
    // (user and orgId already declared above)

    // Get sitters for this org with their assigned numbers
    const sitters = await (prisma as any).sitter.findMany({
      where: {
        orgId, // CRITICAL: Filter by orgId
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as any[];

    // Get assigned numbers for all sitters in one query
    const sitterIds = sitters.map(s => s.id);
    const assignedNumbers = await (prisma as any).messageNumber.findMany({
      where: {
        orgId,
        assignedSitterId: { in: sitterIds },
        class: 'sitter',
        status: 'active',
      },
      select: {
        id: true,
        assignedSitterId: true,
        e164: true,
      },
    });

    // Create a map of sitterId -> numberId
    const numberMap = new Map<string, string>();
    assignedNumbers.forEach((num: any) => {
      if (num.assignedSitterId) {
        numberMap.set(num.assignedSitterId, num.id);
      }
    });

    // Transform sitters to match frontend expectations
    const transformedSitters = sitters.map((sitter) => {
      const nameParts = (sitter.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return {
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
        assignedNumberId: numberMap.get(sitter.id) || null, // Include persistent sitter number ID
      };
    });

    return NextResponse.json({ sitters: transformedSitters }, {
      headers: {
        'X-Snout-Api': 'sitters-route-hit',
        'X-Snout-Route': 'prisma-fallback',
        'X-Snout-OrgId': orgId,
      },
    });
  } catch (error: any) {
    console.error('[Sitters API] Failed to fetch sitters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitters', message: error.message },
      { 
        status: 500,
        headers: {
          'X-Snout-Api': 'sitters-route-hit',
          'X-Snout-Route': 'error',
          'X-Snout-OrgId': orgId,
        },
      }
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

    // Create sitter using Prisma (enterprise-messaging-dashboard schema: id, orgId, userId, name, active, createdAt, updatedAt)
    const sitter = await prisma.sitter.create({
      data: {
        orgId,
        name,
        active: isActive,
      } as any, // Type assertion: runtime uses enterprise-messaging-dashboard schema
    }) as any;

    // If sitter is active, assign a dedicated masked number (persistent assignment)
    if (isActive === true) {
      try {
        const { assignSitterMaskedNumber } = await import('@/lib/messaging/number-helpers');
        const { getMessagingProvider } = await import('@/lib/messaging/provider-factory');
        
        const provider = await getMessagingProvider(orgId);
        await assignSitterMaskedNumber(orgId, sitter.id, provider);
      } catch (error: any) {
        // Log but don't fail sitter creation if number assignment fails
        console.warn(`[Sitter Creation] Failed to assign number to new sitter ${sitter.id}:`, error);
      }
    }

    // Return sitter in format expected by frontend
    return NextResponse.json({ 
      sitter: {
        id: sitter.id,
        firstName,
        lastName,
        name: sitter.name || '',
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
