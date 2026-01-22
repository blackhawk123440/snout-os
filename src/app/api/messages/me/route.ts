/**
 * GET /api/messages/me
 * Phase 4.2: Returns current user's messaging role and feature flags.
 * Used by messages UI to switch between owner vs sitter experience.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSafe } from '@/lib/auth-helpers';
import { getCurrentSitterId } from '@/lib/sitter-helpers';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json({ error: 'Messaging V1 not enabled' }, { status: 404 });
    }

    const user = await getCurrentUserSafe(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sitterId = await getCurrentSitterId(request);
    const isSitter = !!sitterId;
    const sitterMessagesEnabled = env.ENABLE_SITTER_MESSAGES_V1;

    return NextResponse.json({
      role: isSitter ? 'sitter' : 'owner',
      sitterId: sitterId || null,
      sitterMessagesEnabled,
      messagingV1Enabled: true,
    });
  } catch (e) {
    console.error('[messages/me] Error:', e);
    return NextResponse.json({ error: 'Failed to get messaging context' }, { status: 500 });
  }
}
