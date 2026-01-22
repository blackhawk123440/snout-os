/**
 * Thread Assignment Endpoint
 * 
 * POST /api/messages/threads/[id]/assign
 * 
 * Assigns a sitter to a thread and updates provider routing.
 * Gate 2: Routing and Masking
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { assignNumberToThread, determineThreadNumberClass } from "@/lib/messaging/number-helpers";
import { findOrCreateAssignmentWindow } from "@/lib/messaging/window-helpers";

// Initialize Twilio provider
const twilioProvider = new TwilioProvider();

/**
 * POST /api/messages/threads/[id]/assign
 * 
 * Assigns a sitter to a thread.
 * Body: { sitterId: string, reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Check permissions - only owner role allowed
    // For now, allow authenticated users

    // Get orgId from context
    const orgId = await getOrgIdFromContext(currentUser.id);

    const { id: threadId } = await params;

    // Parse request body
    const body = await request.json();
    const { sitterId, reason } = body;

    // Validate required fields
    if (!sitterId) {
      return NextResponse.json(
        { error: "Missing required field: sitterId" },
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

    // Verify sitter exists (optional - could also allow null to unassign)
    if (sitterId) {
      const sitter = await prisma.sitter.findUnique({
        where: { id: sitterId },
      });

      if (!sitter) {
        return NextResponse.json(
          { error: "Sitter not found" },
          { status: 404 }
        );
      }
    }

    // Transaction: Create audit, update thread, update provider session
    const fromSitterId = thread.assignedSitterId;
    const toSitterId = sitterId || null;

    try {
      // Start transaction (Prisma doesn't support explicit transactions in this setup,
      // so we'll do manual rollback on error)
      
      // 1. Create assignment audit
      const audit = await prisma.threadAssignmentAudit.create({
        data: {
          orgId,
          threadId: thread.id,
          fromSitterId,
          toSitterId,
          actorUserId: currentUser.id,
          reason: reason || null,
        },
      });

      // 2. Update thread assignment
      const updatedThread = await prisma.messageThread.update({
        where: { id: thread.id },
        data: {
          assignedSitterId: toSitterId,
        },
        include: {
          assignmentWindows: {
            where: { status: 'active' },
          },
        },
      });

      // Phase 2.3: Create/update assignment window if thread has bookingId
      if (toSitterId && thread.bookingId) {
        try {
          const booking = await prisma.booking.findUnique({
            where: { id: thread.bookingId },
            select: {
              id: true,
              service: true,
              startAt: true,
              endAt: true,
            },
          });

          if (booking) {
            const windowId = await findOrCreateAssignmentWindow(
              booking.id,
              thread.id,
              toSitterId,
              booking.startAt,
              booking.endAt,
              booking.service,
              orgId
            );

            // Update thread with current window ID
            await prisma.messageThread.update({
              where: { id: thread.id },
              data: { assignmentWindowId: windowId },
            });
          }
        } catch (windowError) {
          console.error('[assign] Failed to create/update assignment window:', windowError);
          // Don't rollback assignment - window creation is non-critical
          // Window can be created manually if needed
        }
      } else if (!toSitterId && thread.bookingId) {
        // Sitter unassigned - close active windows for this booking
        try {
          const { closeAllBookingWindows } = await import('@/lib/messaging/window-helpers');
          await closeAllBookingWindows(thread.bookingId);
          
          // Clear assignmentWindowId on thread
          await prisma.messageThread.update({
            where: { id: thread.id },
            data: { assignmentWindowId: null },
          });
        } catch (windowError) {
          console.error('[assign] Failed to close assignment windows:', windowError);
          // Don't rollback - continue
        }
      }

      // Phase 1.3: Reassign number if sitter assigned (pool/front_desk -> sitter masked)
      if (toSitterId) {
        // Determine new number class (should be 'sitter' if sitter assigned)
        const newNumberClass = await determineThreadNumberClass({
          assignedSitterId: toSitterId,
          isMeetAndGreet: thread.isMeetAndGreet || false,
          isOneTimeClient: thread.isOneTimeClient || false,
        });

        // Only reassign if number class changed
        const currentNumberClass = thread.numberClass;
        if (currentNumberClass !== newNumberClass) {
          try {
            await assignNumberToThread(
              thread.id,
              newNumberClass,
              orgId,
              twilioProvider,
              {
                sitterId: toSitterId,
                isOneTimeClient: thread.isOneTimeClient || false,
                isMeetAndGreet: thread.isMeetAndGreet || false,
              }
            );
          } catch (numberError) {
            console.error('[assign] Failed to reassign number:', numberError);
            // Log error but don't rollback assignment - number assignment is non-critical
            // Thread can continue with old number until manually fixed
          }
        }
      } else {
        // Sitter unassigned - reassign to front_desk or pool based on client type
        const newNumberClass = await determineThreadNumberClass({
          assignedSitterId: null,
          isMeetAndGreet: thread.isMeetAndGreet || false,
          isOneTimeClient: thread.isOneTimeClient || false,
        });

        if (thread.numberClass !== newNumberClass) {
          try {
            await assignNumberToThread(
              thread.id,
              newNumberClass,
              orgId,
              twilioProvider,
              {
                isOneTimeClient: thread.isOneTimeClient || false,
                isMeetAndGreet: thread.isMeetAndGreet || false,
              }
            );
          } catch (numberError) {
            console.error('[assign] Failed to reassign number after unassignment:', numberError);
            // Log error but don't rollback
          }
        }
      }

      // 3. Update provider session participants (if session exists)
      if (thread.providerSessionSid) {
        // Find client participant
        const clientParticipant = thread.participants.find(p => p.role === 'client');
        if (!clientParticipant || !clientParticipant.providerParticipantSid) {
          console.warn('[assign] Client participant not found or missing providerParticipantSid, skipping session update');
        } else {
          // Build sitter participant SIDs (phone numbers for now)
          const sitterParticipantSids: string[] = [];
          if (toSitterId) {
            const sitter = await prisma.sitter.findUnique({
              where: { id: toSitterId },
              select: { phone: true },
            });
            if (sitter?.phone) {
              sitterParticipantSids.push(sitter.phone);
            }
          }

          // Update provider session
          const sessionUpdateResult = await twilioProvider.updateSessionParticipants({
            sessionSid: thread.providerSessionSid,
            clientParticipantSid: clientParticipant.providerParticipantSid,
            sitterParticipantSids,
          });

          // If provider update fails, rollback DB changes
          if (!sessionUpdateResult.success) {
            // Rollback: revert thread assignment
            await prisma.messageThread.update({
              where: { id: thread.id },
              data: {
                assignedSitterId: fromSitterId,
              },
            });

            // Delete audit record
            await prisma.threadAssignmentAudit.delete({
              where: { id: audit.id },
            });

            return NextResponse.json(
              {
                error: "Failed to update provider session",
                details: sessionUpdateResult.error,
              },
              { status: 500 }
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        threadId: thread.id,
        fromSitterId,
        toSitterId,
        auditId: audit.id,
      });
    } catch (dbError) {
      console.error('[assign] Database error during assignment:', dbError);
      return NextResponse.json(
        { error: "Failed to assign sitter" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[messages/threads/[id]/assign] Error:", error);
    return NextResponse.json(
      { error: "Failed to assign sitter" },
      { status: 500 }
    );
  }
}
