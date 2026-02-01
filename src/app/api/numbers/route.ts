/**
 * Numbers API Endpoint
 * 
 * GET /api/numbers - List all numbers
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgIdFromContext(currentUser.id);
    const { searchParams } = new URL(request.url);
    
    const classFilter = searchParams.get('class');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { orgId };
    
    if (classFilter) {
      where.numberClass = classFilter;
    }
    
    if (statusFilter) {
      where.status = statusFilter;
    }
    
    if (search) {
      where.OR = [
        { e164: { contains: search } },
      ];
    }

    const numbers = await prisma.messageNumber.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch sitters separately
    const sitterIds = numbers.map(n => n.assignedSitterId).filter((id): id is string => !!id);
    const sitters = sitterIds.length > 0 ? await prisma.sitter.findMany({
      where: { id: { in: sitterIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }) : [];
    const sitterMap = new Map(sitters.map(s => [s.id, s]));

    // Get rotation settings for capacity check
    const rotationSettings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'rotation.',
        },
      },
    });
    const settings: Record<string, string> = {};
    for (const setting of rotationSettings) {
      const key = setting.key.replace('rotation.', '');
      settings[key] = setting.value;
    }
    const maxConcurrent = parseInt(settings.maxConcurrentThreadsPerPoolNumber || '1', 10) || 1;

    // Get thread counts for each number
    const numberIds = numbers.map(n => n.id);
    const threadCounts = await prisma.messageThread.groupBy({
      by: ['messageNumberId'],
      where: {
        orgId,
        messageNumberId: { in: numberIds },
        status: { not: 'archived' },
      },
      _count: {
        id: true,
      },
    });
    const countMap = new Map<string, number>();
    for (const tc of threadCounts) {
      if (tc.messageNumberId) {
        countMap.set(tc.messageNumberId, tc._count.id);
      }
    }

    // Check for pool exhausted alerts
    const poolExhaustedAlerts = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'alert.pool.exhausted.',
        },
        category: 'alert',
      },
    });
    const hasPoolExhaustedAlert = poolExhaustedAlerts.length > 0;

    return NextResponse.json(numbers.map(n => {
      const activeThreadCount = countMap.get(n.id) || 0;
      const isAtCapacity = n.numberClass === 'pool' && activeThreadCount >= maxConcurrent;
      const capacityStatus = n.numberClass === 'pool' 
        ? (isAtCapacity ? 'At Capacity' : 'OK')
        : null;

      return {
        id: n.id,
        e164: n.e164,
        class: n.numberClass,
        status: n.status,
        assignedSitterId: n.assignedSitterId,
        assignedSitter: n.assignedSitterId ? (sitterMap.get(n.assignedSitterId) ? {
          id: sitterMap.get(n.assignedSitterId)!.id,
          name: `${sitterMap.get(n.assignedSitterId)!.firstName} ${sitterMap.get(n.assignedSitterId)!.lastName}`,
        } : null) : null,
        providerType: n.provider,
        providerNumberSid: n.providerNumberSid,
        purchaseDate: null, // Not in root schema
        lastUsedAt: n.lastAssignedAt?.toISOString() || null,
        // Pool state
        activeThreadCount: n.numberClass === 'pool' ? activeThreadCount : null,
        capacityStatus,
        maxConcurrentThreads: n.numberClass === 'pool' ? maxConcurrent : null,
      };
    }), {
      headers: {
        'X-Pool-Exhausted': hasPoolExhaustedAlert ? 'true' : 'false',
      },
    });
  } catch (error: any) {
    console.error("[numbers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch numbers" },
      { status: 500 }
    );
  }
}
