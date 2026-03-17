import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';
import { logEvent } from '@/lib/log-event';

const InviteSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(200).optional(),
  phone: z.string().min(5).max(30),
});

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });

    const db = getScopedDb(ctx);
    const d = parsed.data;

    // Check for existing sitter with same phone
    const existing = await db.sitter.findFirst({
      where: { phone: d.phone },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'A sitter with this phone number already exists' }, { status: 409 });
    }

    // Create sitter (inactive until onboarding complete)
    const sitter = await db.sitter.create({
      data: {
        orgId: ctx.orgId,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email || '',
        phone: d.phone,
        active: false,
      },
    });

    // Create user account for sitter login
    const { randomUUID } = await import('node:crypto');
    const tempPassword = randomUUID().slice(0, 12);
    try {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      await db.user.create({
        data: {
          orgId: ctx.orgId,
          name: `${d.firstName} ${d.lastName}`.trim(),
          email: d.email || `sitter-${sitter.id}@snout.local`,
          passwordHash,
          role: 'sitter',
          sitterId: sitter.id,
        },
      });
    } catch (userErr) {
      console.error('[sitter-invite] User creation failed (non-blocking):', userErr);
    }

    await logEvent({
      orgId: ctx.orgId,
      action: 'sitter.invited',
      status: 'success',
      metadata: { sitterId: sitter.id, sitterName: `${d.firstName} ${d.lastName}`.trim() },
    });

    return NextResponse.json({
      id: sitter.id,
      name: `${d.firstName} ${d.lastName}`.trim(),
      tempPassword,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to invite', message }, { status: 500 });
  }
}
