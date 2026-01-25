/**
 * Twilio Webhook Endpoint
 * 
 * Handles inbound SMS messages and status callbacks from Twilio.
 * Per Messaging Master Spec V1:
 * - Verifies webhook signature
 * - Normalizes provider payload to domain events
 * - Creates or finds thread and participants
 * - Creates MessageEvent inbound
 * - Updates thread timestamps
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";
import { getOrgIdFromNumber } from "@/lib/messaging/number-org-mapping";
import { NotFoundError } from "@/lib/messaging/errors";
import { handleApiError } from "@/lib/messaging/api-error-handler";
import { ensureThreadSession } from "@/lib/messaging/session-helpers";
import {
  determineThreadNumberClass,
  assignNumberToThread,
  validatePoolNumberRouting,
} from "@/lib/messaging/number-helpers";
import { handlePoolNumberMismatch } from "@/lib/messaging/pool-routing";
import { determineClientClassification } from "@/lib/messaging/client-classification";
import { env } from "@/lib/env";
import { createWebhookLogEntry, redactPhoneNumber } from "@/lib/messaging/logging-helpers";
import { resolveRoutingForInboundMessage } from "@/lib/messaging/routing-resolution";
import { routeToOwnerInbox } from "@/lib/messaging/owner-inbox-routing";
import { checkAntiPoaching, blockAntiPoachingMessage } from "@/lib/messaging/anti-poaching-enforcement";
import { resolveInboundSms } from "@/lib/messaging/routing-resolver";
import { logMessagingEvent } from "@/lib/messaging/audit-trail";

// Initialize Twilio provider
const twilioProvider = new TwilioProvider();

/**
 * POST /api/messages/webhook/twilio
 * 
 * Receives inbound messages and status callbacks from Twilio.
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification (must be done before parsing)
    const rawBody = await request.text();
    
    // Get webhook URL for signature verification
    // Construct the full URL from request headers to match what Twilio actually called
    // This ensures we use the ngrok URL, not localhost
    const host = request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const path = new URL(request.url).pathname;
    const search = new URL(request.url).search;
    const webhookUrl = `${protocol}://${host}${path}${search}`;
    
    // Get signature from request headers
    const signature = request.headers.get("x-twilio-signature") || '';
    
    // Verify webhook signature first (before parsing message)
    // Phase 1.5: In production, invalid signature MUST return 401 and store nothing
    const hasAuthToken = twilioProvider.hasWebhookAuthToken();
    
    // Debug logging
    console.log('[webhook/twilio] Signature verification check:', {
      hasAuthToken,
      hasSignature: !!signature,
      webhookUrl,
      enableMessagingV1: env.ENABLE_MESSAGING_V1,
    });
    
    // If no auth token configured, skip verification (dev mode)
    if (!hasAuthToken) {
      console.warn('[webhook/twilio] TWILIO_WEBHOOK_AUTH_TOKEN not configured, skipping signature verification (dev mode)');
    } else {
      // Auth token is set, verify signature
      const isValid = twilioProvider.verifyWebhook(rawBody, signature, webhookUrl);
      if (!isValid) {
        // Phase 1.5: Return 401 for invalid signature
        // Note: orgId not yet available at this point, will be derived from number below
        console.warn(
          createWebhookLogEntry('Signature verification failed', {
            orgId: 'unknown', // orgId not available before message parsing
            routingDecision: 'rejected_invalid_signature',
          })
        );
        
        // Debug: Log the webhook URL being used for verification
        console.warn('[webhook/twilio] URL used for verification:', webhookUrl);
        console.warn('[webhook/twilio] Has signature:', !!signature);
        
        // Phase 1.5: In production, MUST return 401
        // For development, check ENABLE_MESSAGING_V1 flag
        if (env.ENABLE_MESSAGING_V1) {
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
        
        // Development mode: Log but allow (backward compatibility)
        console.warn('[webhook/twilio] Development mode: Allowing invalid signature');
      } else {
        console.log('[webhook/twilio] Signature verification passed');
      }
    }

    // Parse form-urlencoded data manually (since we already consumed the body with .text())
    // Twilio sends webhooks as application/x-www-form-urlencoded
    const payload: any = {};
    const params = new URLSearchParams(rawBody);
    for (const [key, value] of params.entries()) {
      payload[key] = value;
    }

    // Determine if this is a status callback or inbound message
    // Status callbacks have MessageStatus field
    const isStatusCallback = payload.MessageStatus !== undefined;

    if (isStatusCallback) {
      // Handle status callback
      const statusCallback = twilioProvider.parseStatusCallback(payload);
      
      // Find message event by provider message SID
      const messageEvent = await prisma.messageEvent.findFirst({
        where: {
          providerMessageSid: statusCallback.messageSid,
        },
      });

      if (messageEvent) {
        // Update delivery status
        await prisma.messageEvent.update({
          where: { id: messageEvent.id },
          data: {
            deliveryStatus: statusCallback.status,
            failureCode: statusCallback.errorCode,
            failureDetail: statusCallback.errorMessage,
          },
        });
      }

      // Return 200 quickly (Twilio expects quick response)
      return NextResponse.json({ received: true });
    }

    // Handle inbound message
    const inboundMessage = twilioProvider.parseInbound(payload);
    
    // Step 3: Derive orgId from "to" number (REAL org routing)
    let orgId: string;
    try {
      orgId = await getOrgIdFromNumber(inboundMessage.to);
    } catch (error) {
      console.error('[webhook/twilio] Failed to get orgId from number:', error);
      return NextResponse.json(
        { error: "Number not found or inactive" },
        { status: 404 }
      );
    }
    
    // Log inbound message receipt with redacted phone numbers
    console.log(
      createWebhookLogEntry('Inbound message received', {
        orgId,
        senderE164: inboundMessage.from,
        recipientE164: inboundMessage.to,
      })
    );

    // Step 6.2: Use routing resolver to determine thread and routing
    let routingResult;
    try {
      routingResult = await resolveInboundSms(
        {
          orgId,
          toNumberE164: inboundMessage.to,
          fromNumberE164: inboundMessage.from,
          now: inboundMessage.timestamp,
        },
        twilioProvider
      );
    } catch (error) {
      console.error("[webhook/twilio] Routing resolver error:", error);
      // Fallback to legacy routing logic if resolver fails
      routingResult = null;
    }

    let thread: any;
    let shouldRouteToOwner = false;
    let autoResponseText: string | undefined;

    if (routingResult) {
      // Use resolver result
      thread = await prisma.messageThread.findUnique({
        where: { id: routingResult.threadId },
      });

      if (!thread) {
        // Thread doesn't exist - create it
        // Find client by phone
        const client = await prisma.client.findFirst({
          where: { phone: inboundMessage.from },
        });

        const clientClassification = await determineClientClassification({
          clientId: client?.id || null,
          bookingId: null,
          orgId,
        });

        thread = await prisma.messageThread.create({
          data: {
            orgId,
            threadType: routingResult.threadType,
            scope: routingResult.threadType === "JOB" ? "client_general" : "internal",
            clientId: client?.id || null,
            status: "open",
            isOneTimeClient: clientClassification.isOneTimeClient,
            lastInboundAt: inboundMessage.timestamp,
            lastMessageAt: inboundMessage.timestamp,
          },
        });

        // Assign number to thread
        const numberClass = await determineThreadNumberClass({
          assignedSitterId: thread.assignedSitterId,
          isMeetAndGreet: false,
          isOneTimeClient: clientClassification.isOneTimeClient,
        });

        try {
          await assignNumberToThread(
            thread.id,
            numberClass,
            orgId,
            twilioProvider,
            {
              isOneTimeClient: clientClassification.isOneTimeClient,
              isMeetAndGreet: false,
            }
          );
        } catch (error) {
          console.error("[webhook/twilio] Failed to assign number:", error);
        }
      }

      shouldRouteToOwner = routingResult.deliverTo.owner;
      autoResponseText = routingResult.autoResponse;
    } else {
      // Fallback to legacy logic
      // Find or create client by phone number
      let client = await prisma.client.findFirst({
        where: {
          phone: inboundMessage.from,
        },
      });

      // Find or create thread
      thread = await prisma.messageThread.findFirst({
        where: {
          orgId,
          clientId: client?.id || null,
          scope: 'client_general',
          status: {
            not: 'archived',
          },
        },
      });

      if (!thread) {
        // Phase 1.3.2: Deterministic one-time client classification
        const clientClassification = await determineClientClassification({
          clientId: client?.id || null,
          bookingId: null, // No booking context for general inquiries
          orgId,
        });

        // Phase 1.2: Determine number class for new thread
        const numberClass = await determineThreadNumberClass({
          assignedSitterId: null,
          isMeetAndGreet: false,
          isOneTimeClient: clientClassification.isOneTimeClient, // Use explicit classification
        });

        thread = await prisma.messageThread.create({
          data: {
            orgId,
            scope: 'client_general',
            clientId: client?.id || null,
            status: 'open',
            numberClass, // Will be set correctly by assignNumberToThread
            isOneTimeClient: clientClassification.isOneTimeClient, // Explicit classification
            lastInboundAt: inboundMessage.timestamp,
            lastMessageAt: inboundMessage.timestamp,
          },
        });

        // Phase 1.2: Assign number to thread based on number class
        try {
          await assignNumberToThread(
            thread.id,
            numberClass,
            orgId,
            twilioProvider,
            {
              isOneTimeClient: clientClassification.isOneTimeClient,
              isMeetAndGreet: false,
            }
          );
        } catch (error) {
          console.error("[webhook/twilio] Failed to assign number to thread:", error);
          // Continue - number assignment failure shouldn't block message storage
          // In production, you may want to alert on this
        }
      } else {
        // Phase 1.3.1: Validate pool number routing if thread uses pool number
        if (thread.messageNumberId && thread.numberClass === 'pool') {
          const routingValidation = await validatePoolNumberRouting(
            thread.messageNumberId,
            inboundMessage.from,
            orgId
          );

          if (!routingValidation.isValid) {
            // Phase 1.3.1: Handle pool number mismatch - route to owner + auto-response + audit
            console.log(
              createWebhookLogEntry('Pool number mismatch detected', {
                orgId,
                messageNumberId: thread.messageNumberId,
                threadId: thread.id,
                numberClass: thread.numberClass,
                routingDecision: 'route_to_owner_inbox',
                senderE164: inboundMessage.from,
              })
            );

            try {
              await handlePoolNumberMismatch(
                thread.messageNumberId,
                inboundMessage,
                orgId,
                twilioProvider
              );

              // Return early - message has been routed to owner inbox and auto-response sent
              return NextResponse.json({ received: true });
            } catch (error) {
              console.error(
                createWebhookLogEntry('Failed to handle pool number mismatch', {
                  orgId,
                  messageNumberId: thread.messageNumberId,
                  threadId: thread.id,
                  numberClass: thread.numberClass,
                  routingDecision: 'error',
                })
              );
              // Continue - fallback to storing in original thread
              // In production, you may want to alert on this
            }
          }
        }

        // Phase 2.1: Routing resolution engine - check assignment window at message timestamp
        const routingResolution = await resolveRoutingForInboundMessage(thread.id, inboundMessage.timestamp);

        // Phase 2.1: Route to owner inbox if no active window or overlapping windows
        if (routingResolution.target === 'owner_inbox') {
          console.log(
            createWebhookLogEntry('Routing to owner inbox (assignment window)', {
              orgId,
              messageNumberId: thread.messageNumberId,
              threadId: thread.id,
              numberClass: thread.numberClass,
              routingDecision: 'route_to_owner_inbox',
              senderE164: inboundMessage.from,
            })
          );

          try {
            await routeToOwnerInbox(inboundMessage, orgId, routingResolution.reason);

            // Return early - message has been routed to owner inbox
            return NextResponse.json({ received: true });
          } catch (error) {
            console.error(
              createWebhookLogEntry('Failed to route to owner inbox', {
                orgId,
                messageNumberId: thread.messageNumberId,
                threadId: thread.id,
                numberClass: thread.numberClass,
                routingDecision: 'error',
              })
            );
            // Continue - fallback to storing in original thread
          }
        }

        // Phase 2.1: Route to sitter if exactly one active window
        // The message will be stored in the thread, and the sitter will see it
        // (Phase 2.1 doesn't require moving the message, just ensuring routing decision is logged)

        // Update thread timestamps
        await prisma.messageThread.update({
          where: { id: thread.id },
          data: {
            lastInboundAt: inboundMessage.timestamp,
            lastMessageAt: inboundMessage.timestamp,
          },
        });
      }
    }

    // Find client for participant creation
    const client = await prisma.client.findFirst({
      where: {
        phone: inboundMessage.from,
      },
    });

    // Find or create client participant
    let participant = await prisma.messageParticipant.findFirst({
      where: {
        threadId: thread.id,
        role: 'CLIENT',
        realE164: inboundMessage.from,
      },
    });

    if (!participant) {
      participant = await prisma.messageParticipant.create({
        data: {
          threadId: thread.id,
          orgId,
          entityType: 'CLIENT',
          entityId: client?.id || inboundMessage.from, // Use client ID or phone as fallback
          role: 'CLIENT',
          displayName: client ? `${client.firstName} ${client.lastName}` : inboundMessage.from,
          realE164: inboundMessage.from,
          providerParticipantSid: null, // Will be set when session is created
        },
      });
    }

    // Gate 2: Ensure thread has provider session and participants (create if needed)
    // If session creation fails (e.g., auth error), log but don't block message storage
    try {
      await ensureThreadSession(thread.id, twilioProvider, inboundMessage.from);
      // Return value contains sessionSid and clientParticipant, but we don't need it here
      // The session is persisted, and participant is updated with providerParticipantSid
    } catch (sessionError) {
      console.error("[webhook/twilio] Failed to ensure session:", sessionError);
      // Continue - session creation failure shouldn't block message storage
      // In production, you may want to alert on this, but for now allow messages through
      // TODO: Fix Proxy Session authentication to enable masking (Gate 2 requirement)
    }

    // Phase 3.2: Anti-poaching detection and enforcement for inbound messages
    const detection = checkAntiPoaching(inboundMessage.body);
    
    if (detection.detected) {
      // Block message and create audit records
      const blockingResult = await blockAntiPoachingMessage({
        threadId: thread.id,
        orgId,
        direction: 'inbound',
        actorType: 'client',
        actorId: client?.id || undefined,
        body: inboundMessage.body,
        violations: detection.violations,
        provider: twilioProvider,
        inboundMessage,
      });

      // Return early - message has been blocked, logged, and warning sent
      return NextResponse.json({ received: true, blocked: true });
    }

    // Gate 2: Get thread with assignedSitterId for snapshot
    const threadWithAssignment = await prisma.messageThread.findUnique({
      where: { id: thread.id },
      select: { assignedSitterId: true },
    });

    // Create inbound message event with snapshot
    const messageEvent = await prisma.messageEvent.create({
      data: {
        threadId: thread.id,
        orgId,
        direction: 'inbound',
        actorType: 'client',
        actorClientId: client?.id || null,
        providerMessageSid: inboundMessage.messageSid,
        body: inboundMessage.body,
        mediaJson: inboundMessage.mediaUrls ? JSON.stringify(inboundMessage.mediaUrls) : null,
        deliveryStatus: 'received',
        responsibleSitterIdSnapshot: threadWithAssignment?.assignedSitterId || null, // Gate 2: Snapshot
        createdAt: inboundMessage.timestamp,
      },
    });

    // Phase 1.5: Log message event creation with full context
    console.log(
      createWebhookLogEntry('Message event created', {
        orgId,
        messageNumberId: thread.messageNumberId,
        threadId: thread.id,
        numberClass: thread.numberClass,
        routingDecision: thread.numberClass === 'pool' ? 'pool_thread' : 'standard_thread',
        senderE164: inboundMessage.from,
      })
    );

    // Step 8: Log audit event (inbound_received)
    try {
      await logMessagingEvent({
        orgId,
        eventType: 'inbound_received',
        threadId: thread.id,
        messageId: messageEvent.id,
        metadata: {
          hasMedia: !!inboundMessage.mediaUrls,
          numberClass: thread.numberClass,
        },
      });
    } catch (auditError) {
      // Don't block webhook response on audit logging failure
      console.error('[webhook/twilio] Failed to log audit event:', auditError);
    }

    // Return 200 quickly (Twilio expects quick response)
    // Do not block on downstream actions (opt out, quiet hours, etc.)
    return NextResponse.json({ received: true });
  } catch (error) {
    // Log full error details for debugging
    console.error("[webhook/twilio] Error processing webhook:", error);
    if (error instanceof Error) {
      console.error("[webhook/twilio] Error message:", error.message);
      console.error("[webhook/twilio] Error stack:", error.stack);
    }
    
    // Return 200 even on error to prevent Twilio retries
    // Errors will be logged and can be handled asynchronously
    // In development, include error details
    const errorResponse: any = { error: "Processing error" };
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      errorResponse.details = error.message;
      errorResponse.stack = error.stack;
    }
    
    return NextResponse.json(
      errorResponse,
      { status: 200 }
    );
  }
}
