/**
 * Seed SRS Proof Endpoint (Owner Only)
 * 
 * POST /api/messages/seed-srs-proof
 * 
 * Runs the seed script and automatically triggers snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Owner only
  if (session.user.role !== 'owner' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Guardrail: Only in dev/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_OPS_SRS) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Run seed script
    const { stdout, stderr } = await execAsync(
      'npx tsx scripts/seed-srs-proof.ts',
      { cwd: process.cwd() }
    );

    if (stderr && !stderr.includes('✓')) {
      console.error('[Seed SRS] Warnings:', stderr);
    }

    // Wait a moment for data to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger snapshot
    const orgId = (session.user as any).orgId;
    if (orgId) {
      const snapshotUrl = new URL('/api/ops/srs/run-snapshot', request.url);
      const snapshotRes = await fetch(snapshotUrl.toString(), {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        },
      });

      const snapshotData = await snapshotRes.json();

      return NextResponse.json({
        success: true,
        seedOutput: stdout,
        snapshot: snapshotData,
      });
    }

    return NextResponse.json({
      success: true,
      seedOutput: stdout,
      message: 'Seed completed. Run snapshot manually.',
    });
  } catch (error: any) {
    console.error('[Seed SRS Proof] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed proof data', 
        message: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}
