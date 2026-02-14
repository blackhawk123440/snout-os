/**
 * API Route: Seed Messaging Proof Scenarios
 * 
 * Creates demo data for proof pack. Only available in dev/staging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  // Only allow in dev/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_OPS_SEED) {
    return NextResponse.json(
      { error: 'Seed endpoint disabled in production' },
      { status: 403 }
    );
  }

  // Require owner authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is owner
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Owner access required' },
      { status: 403 }
    );
  }

  try {
    // Run seed script
    const { stdout, stderr } = await execAsync(
      'tsx scripts/seed-messaging-proof.ts',
      { cwd: process.cwd() }
    );

    if (stderr && !stderr.includes('✅')) {
      console.error('Seed stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Proof scenarios seeded successfully',
      output: stdout,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed proof scenarios',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
