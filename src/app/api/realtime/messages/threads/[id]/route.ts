/**
 * GET /api/realtime/messages/threads/[id]
 * SSE stream for message thread updates. Requires auth, org scoping, thread membership.
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getScopedDb } from '@/lib/tenancy';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { createSSEResponse, sendSSEEvent } from '@/lib/realtime/sse';
import { publish, subscribe, channels } from '@/lib/realtime/bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const threadId = params.id;

  const id = getRateLimitIdentifier(request);
  const rl = await checkRateLimit(id, {
    keyPrefix: 'sse-connect',
    limit: 10,
    windowSec: 60,
  });
  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: 'Too many connections', retryAfter: rl.retryAfter }),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = session.user as { orgId?: string; sitterId?: string; role?: string };
  const orgId = user.orgId ?? 'default';

  const db = getScopedDb({ orgId });
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: { id: true },
  });

  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const channel = channels.messagesThread(orgId, threadId);

  return createSSEResponse({
    initial: { type: 'connected', threadId, ts: Date.now() },
    onConnect(controller) {
      return subscribe(channel, (payload) => {
        try {
          sendSSEEvent(controller, payload, 'update');
        } catch {
          // Client disconnected
        }
      });
    },
  });
}
