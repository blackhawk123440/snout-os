/**
 * Send Message Endpoint
 * 
 * Handles outbound message sending via messaging provider.
 * Per Messaging Master Spec V1:
 * - Authenticates and resolves org
 * - Checks permissions (owner only for now)
 * - Sends via provider adapter using thread session mapping
 * - Creates MessageEvent outbound
 * - Updates thread timestamps
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { ensureThreadSession } from "@/lib/messaging/session-helpers";
import { hasActiveAssignmentWindow, getNextUpcomingWindow } from "@/lib/messaging/routing-resolution";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
import { checkAntiPoaching, blockAntiPoachingMessage } from "@/lib/messaging/anti-poaching-enforcement";
import { env } from "@/lib/env";

// Initialize Twilio provider
const twilioProvider = new TwilioProvider();

/**
 * POST /api/messages/send
 * 
 * Send an outbound message via messaging provider.
 * Body: { threadId, text, media (optional) }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get orgId from context
    const orgId = await getOrgIdFromContext(currentUser.id);

    // Parse request body
    const body = await request.json();
    const { threadId, text, media } = body;

    // Validate required fields
    if (!threadId || !text) {
      return NextResponse.json(
        { error: "Missing required fields: threadId and text are required" },
        { status: 400 }
      );
    }

    // Find thread and verify org isolation
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participants: true,
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Verify org isolation
    if (thread.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized: Thread belongs to different organization" },
        { status: 403 }
      );
    }

    // Phase 2.2: Sitter send gating - block sitter messages outside assignment windows
    // Check if current user is a sitter
    const currentSitterId = await getCurrentSitterId(request);

    // Phase 4.2: Sitter messages behind ENABLE_SITTER_MESSAGES_V1
    if (currentSitterId && !env.ENABLE_SITTER_MESSAGES_V1) {
      return NextResponse.json(
        { error: "Sitter messages not enabled", errorCode: "SITTER_MESSAGES_DISABLED" },
        { status: 404 }
      );
    }
    
    // If user is a sitter and is the assigned sitter on this thread, check window
    if (currentSitterId && thread.assignedSitterId === currentSitterId) {
      // Phase 2.2: Sitter send gating - block unless active window exists
      const hasActiveWindow = await hasActiveAssignmentWindow(
        currentSitterId,
        thread.id,
        new Date()
      );

      if (!hasActiveWindow) {
        const nextWindow = await getNextUpcomingWindow(currentSitterId, thread.id);
        const windowMsg = nextWindow
          ? ` Your next window for this client is ${nextWindow.startAt.toLocaleString()} – ${nextWindow.endAt.toLocaleString()}.`
          : '';
        return NextResponse.json(
          {
            error: `Messages can only be sent during your active booking windows.${windowMsg}`,
            errorCode: 'NO_ACTIVE_WINDOW',
            nextWindow: nextWindow
              ? { startAt: nextWindow.startAt.toISOString(), endAt: nextWindow.endAt.toISOString() }
              : null,
          },
          { status: 403 }
        );
      }
    }

    // Owner always allowed (no window check)
    // Users who are not the assigned sitter are allowed (they're owners/operators)

    // Find client participant to get destination phone number (needed for anti-poaching check)
    const clientParticipant = thread.participants.find(p => p.role === 'client');
    if (!clientParticipant) {
      return NextResponse.json(
        { error: "No client participant found in thread" },
        { status: 400 }
      );
    }

    // Phase 3.2: Anti-poaching detection and enforcement
    // Skip check if override flag is set (owner override)
    const { forceSend } = body;
    if (!forceSend) {
      const detection = checkAntiPoaching(text);
      
      if (detection.detected) {
        // Block message and create audit records
        const blockingResult = await blockAntiPoachingMessage({
          threadId: thread.id,
          orgId,
          direction: 'outbound',
          // Phase 4.1: Owner sends messages - for anti-poaching, treat as 'sitter' if thread is assigned, otherwise 'client' (outbound from owner)
          // Note: In practice, owner messages are outbound, but anti-poaching treats owner as 'sitter' role
          actorType: 'sitter', // Owner messages are treated as sitter for anti-poaching enforcement
          actorId: currentSitterId || currentUser.id,
          body: text,
          violations: detection.violations,
          provider: twilioProvider,
          senderE164: clientParticipant.realE164,
        });

        // Phase 4.2: Sitter gets friendly warning without exposing client data or violation details
        const isSitterSender = !!currentSitterId;
        return NextResponse.json(
          isSitterSender
            ? {
                error: "Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles. Use the app for all client communication.",
                errorCode: 'ANTI_POACHING_BLOCKED',
              }
            : {
                error: "Message blocked due to anti-poaching policy",
                errorCode: 'ANTI_POACHING_BLOCKED',
                violations: detection.violations.map(v => v.type),
                messageEventId: blockingResult.messageEventId,
              },
          { status: 403 }
        );
      }
    }

    // Gate 2: Check if thread has provider session - use Proxy if it exists
    // If thread.providerSessionSid exists, we MUST use Proxy (never direct send)
    // Only use direct send if no session exists (backward compatibility)
    
    let sessionInfo;
    const hasSession = !!thread.providerSessionSid;

    if (hasSession) {
      // Thread has session - ensure participants exist and use Proxy
      try {
        sessionInfo = await ensureThreadSession(thread.id, twilioProvider, clientParticipant.realE164);
      } catch (sessionError) {
        console.error("[messages/send] Failed to ensure session participants:", sessionError);
        // If session exists but we can't ensure participants, fail (don't leak real numbers)
        return NextResponse.json(
          {
            error: "Failed to ensure Proxy session participants",
            errorCode: 'SESSION_PARTICIPANT_ERROR',
            errorMessage: sessionError instanceof Error ? sessionError.message : String(sessionError),
          },
          { status: 500 }
        );
      }
    } else {
      // No session - try to create one, but allow fallback to direct send if it fails
      try {
        sessionInfo = await ensureThreadSession(thread.id, twilioProvider, clientParticipant.realE164);
        // Refresh thread to get updated providerSessionSid
        const updatedThread = await prisma.messageThread.findUnique({
          where: { id: thread.id },
          select: { providerSessionSid: true },
        });
        if (updatedThread?.providerSessionSid) {
          // Session was created - use Proxy
          thread.providerSessionSid = updatedThread.providerSessionSid;
        }
      } catch (sessionError) {
        console.error("[messages/send] Failed to create session:", sessionError);
        // Continue - session creation failure allows direct send fallback
        sessionInfo = null;
      }
    }

    // Gate 2: Send message via Proxy if session exists, otherwise use direct send
    let sendResult;
    let messageSid: string | null = null;
    let deliveryStatus = 'queued';
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    // CRITICAL: If thread.providerSessionSid exists, we MUST use Proxy (never direct send)
    if (thread.providerSessionSid && sessionInfo) {
      // Send via Proxy using Message Interaction (maintains masking)
      // Find owner participant or create one if needed
      // For now, we'll send from client participant (they're in the session)
      // In the future, we might have an "owner" participant in the session
      
      // Get updated participant with providerParticipantSid
      const updatedClientParticipant = await prisma.messageParticipant.findUnique({
        where: { id: clientParticipant.id },
        select: { providerParticipantSid: true },
      });

      if (!updatedClientParticipant?.providerParticipantSid) {
        return NextResponse.json(
          {
            error: "Client participant missing Proxy identifier",
            errorCode: 'MISSING_PARTICIPANT_SID',
          },
          { status: 500 }
        );
      }

      // For owner sending to client via Proxy, we need an owner participant in the session
      // Find or create owner participant
      let ownerParticipant = thread.participants.find(p => p.role === 'owner' && p.userId === currentUser.id);
      
      if (!ownerParticipant?.providerParticipantSid) {
        // Create owner participant in Proxy session
        // Use business phone number as identifier (from env or masked number)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { env } = require('@/lib/env');
        const ownerIdentifier = env.TWILIO_PHONE_NUMBER || thread.maskedNumberE164 || clientParticipant.realE164;
        
        const ownerParticipantResult = await twilioProvider.createParticipant({
          sessionSid: thread.providerSessionSid,
          identifier: ownerIdentifier,
          friendlyName: 'Owner',
        });

        if (!ownerParticipantResult.success || !ownerParticipantResult.participantSid) {
          return NextResponse.json(
            {
              error: "Failed to create owner participant in Proxy session",
              errorCode: ownerParticipantResult.errorCode,
              errorMessage: ownerParticipantResult.errorMessage,
            },
            { status: 500 }
          );
        }

        // Store owner participant
        if (ownerParticipant) {
          await prisma.messageParticipant.update({
            where: { id: ownerParticipant.id },
            data: {
              providerParticipantSid: ownerParticipantResult.participantSid,
            },
          });
          ownerParticipant.providerParticipantSid = ownerParticipantResult.participantSid;
        } else {
          ownerParticipant = await prisma.messageParticipant.create({
            data: {
              threadId: thread.id,
              orgId,
              role: 'owner',
              userId: currentUser.id,
              displayName: 'Owner',
              realE164: ownerIdentifier, // Business number
              providerParticipantSid: ownerParticipantResult.participantSid,
            },
          });
        }
      }

      // Send via Proxy using Message Interaction from owner participant
      // In Twilio Proxy, Message Interactions send from one participant to all other participants in the session
      // Since client is the only other participant, message goes to client (masked)
      if (!ownerParticipant.providerParticipantSid) {
        return NextResponse.json(
          {
            error: "Owner participant missing Proxy identifier",
            errorCode: 'MISSING_PARTICIPANT_SID',
          },
          { status: 500 }
        );
      }
      
      const proxySendResult = await twilioProvider.sendViaProxy({
        sessionSid: thread.providerSessionSid,
        fromParticipantSid: ownerParticipant.providerParticipantSid,
        body: text,
        mediaUrls: media && Array.isArray(media) ? media : undefined,
      });

      if (!proxySendResult.success) {
        // If Proxy send fails, do not fall back to direct send (would leak real numbers)
        return NextResponse.json(
          {
            error: "Failed to send message via Proxy",
            errorCode: proxySendResult.errorCode,
            errorMessage: proxySendResult.errorMessage,
          },
          { status: 500 }
        );
      }

      messageSid = proxySendResult.interactionSid || null;
      deliveryStatus = proxySendResult.interactionSid ? 'queued' : 'failed';
    } else {
      // No session - use direct send (backward compatibility)
      // CRITICAL: Only allowed if thread.providerSessionSid does NOT exist
      // If thread.providerSessionSid exists, we must use Proxy (never direct send)
      if (thread.providerSessionSid) {
        // This should never happen - if session exists, we should have used Proxy above
        console.error("[messages/send] ERROR: Thread has providerSessionSid but attempting direct send!");
        return NextResponse.json(
          {
            error: "Cannot use direct send when Proxy session exists",
            errorCode: 'PROXY_SESSION_REQUIRED',
          },
          { status: 500 }
        );
      }

      // No session - direct send is OK (backward compatibility)
      const toNumber = clientParticipant.realE164;

      sendResult = await twilioProvider.sendMessage({
        to: toNumber,
        body: text,
        mediaUrls: media && Array.isArray(media) ? media : undefined,
      });

      if (!sendResult.success) {
        return NextResponse.json(
          {
            error: "Failed to send message",
            errorCode: sendResult.errorCode,
            errorMessage: sendResult.errorMessage,
          },
          { status: 500 }
        );
      }

      messageSid = sendResult.messageSid || null;
      deliveryStatus = sendResult.messageSid ? 'queued' : 'failed';
      errorCode = sendResult.errorCode;
      errorMessage = sendResult.errorMessage;
    }

    // Create outbound message event
    const messageEvent = await prisma.messageEvent.create({
      data: {
        threadId: thread.id,
        orgId,
        direction: 'outbound',
        actorType: 'owner', // TODO: Determine from user role
        actorUserId: currentUser.id,
        providerMessageSid: messageSid,
        body: text,
        mediaJson: media && Array.isArray(media) ? JSON.stringify(media) : null,
        deliveryStatus,
        failureCode: errorCode,
        failureDetail: errorMessage,
        createdAt: new Date(),
      },
    });

    // Update thread timestamps
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        lastOutboundAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: messageEvent.id,
      messageSid: messageSid,
      status: messageEvent.deliveryStatus,
    });
  } catch (error) {
    console.error("[messages/send] Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
