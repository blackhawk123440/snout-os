/**
 * GET /api/client/referral
 * Returns the client's referral code and referral count.
 * Auto-generates a referral code if none exists.
 */

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { getScopedDb } from '@/lib/tenancy';
import { prisma } from '@/lib/db';

function generateCode(name: string): string {
  const prefix = (name || 'SNOUT').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'SNOUT';
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${digits}`;
}

export async function GET() {
  let ctx;
  try {
    ctx = await getRequestContext();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, referralCode: true, name: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let referralCode = user.referralCode;

    // Auto-generate if missing
    if (!referralCode) {
      // Try to use first pet name as prefix
      const db = getScopedDb(ctx);
      const clientRecord = await (prisma as any).client.findFirst({
        where: { user: { id: ctx.userId } },
        select: { id: true },
      }).catch(() => null);
      const pet = clientRecord ? await (prisma as any).pet.findFirst({
        where: { clientId: clientRecord.id },
        select: { name: true },
        orderBy: { createdAt: 'asc' },
      }).catch(() => null) : null;

      referralCode = generateCode(pet?.name || user.name || '');

      // Ensure uniqueness
      const existing = await (prisma as any).user.findFirst({ where: { referralCode } });
      if (existing) referralCode = generateCode(user.name || 'SNOUT');

      await (prisma as any).user.update({
        where: { id: ctx.userId },
        data: { referralCode },
      });
    }

    // Count referrals
    const referralCount = await (prisma as any).user.count({
      where: { referredBy: referralCode },
    });

    return NextResponse.json({ referralCode, referralCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load referral', message: msg }, { status: 500 });
  }
}
