/**
 * Session Helpers
 * 
 * Helper functions for managing provider masking sessions.
 * Ensures session lifecycle: create on first message, reuse for subsequent.
 * Gate 2: Ensures Proxy Participants exist and stores providerParticipantSid.
 */

import { prisma } from "@/lib/db";
import { MessagingProvider, CreateSessionOptions, CreateParticipantResult } from "./provider";

export interface EnsureParticipantResult {
  participantSid: string;
  proxyIdentifier: string; // The masked number for this participant
}

/**
 * Ensure thread has a provider session and client participant
 * 
 * If thread already has providerSessionSid, returns it.
 * Otherwise, creates a new session and persists it.
 * Also ensures client participant exists in the session.
 * 
 * @param threadId - Thread ID
 * @param provider - Provider adapter
 * @param clientE164 - Client's real phone number
 * @returns Session SID and client participant info
 */
export async function ensureThreadSession(
  threadId: string,
  provider: MessagingProvider,
  clientE164: string
): Promise<{ sessionSid: string; clientParticipant: EnsureParticipantResult }> {
  // Get thread with current session and participants
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      participants: {
        where: {
          role: 'client',
        },
        take: 1,
      },
    },
  });

  if (!thread) {
    throw new Error(`Thread ${threadId} not found`);
  }

  let sessionSid: string;
  let maskedNumberE164: string | null = null;

  // If session already exists, use it
  if (thread.providerSessionSid) {
    sessionSid = thread.providerSessionSid;
    maskedNumberE164 = thread.maskedNumberE164;
  } else {
    // Create new session via provider
    const sessionResult = await provider.createSession({
      clientE164,
      maskedNumberE164: thread.maskedNumberE164 || undefined,
    });

    if (!sessionResult.success || !sessionResult.sessionSid) {
      throw new Error(
        `Failed to create provider session: ${sessionResult.errorMessage || 'Unknown error'}`
      );
    }

    sessionSid = sessionResult.sessionSid;
    maskedNumberE164 = sessionResult.maskedNumberE164 || null;

    // Persist session SID and masked number
    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        providerSessionSid: sessionSid,
        maskedNumberE164,
      },
    });
  }

  // Ensure client participant exists in Proxy session
  const clientParticipantRecord = thread.participants[0];
  let clientParticipantSid: string;
  let proxyIdentifier: string;

  if (clientParticipantRecord?.providerParticipantSid) {
    // Participant already exists in Proxy
    clientParticipantSid = clientParticipantRecord.providerParticipantSid;
    // Get proxy identifier from participant (we'll need to fetch it or store it)
    // For now, use masked number as proxy identifier
    proxyIdentifier = maskedNumberE164 || clientE164;
  } else {
    // Create client participant in Proxy session
    const participantResult = await provider.createParticipant({
      sessionSid,
      identifier: clientE164,
      friendlyName: 'Client',
    });

    if (!participantResult.success || !participantResult.participantSid) {
      throw new Error(
        `Failed to create client participant: ${participantResult.errorMessage || 'Unknown error'}`
      );
    }

    clientParticipantSid = participantResult.participantSid;
    proxyIdentifier = participantResult.proxyIdentifier || maskedNumberE164 || clientE164;

    // Update MessageParticipant with providerParticipantSid
    if (clientParticipantRecord) {
      await prisma.messageParticipant.update({
        where: { id: clientParticipantRecord.id },
        data: {
          providerParticipantSid: clientParticipantSid,
        },
      });
    } else {
      // Create participant record if it doesn't exist
      await prisma.messageParticipant.create({
        data: {
          threadId: thread.id,
          orgId: thread.orgId,
          role: 'client',
          clientId: thread.clientId,
          displayName: clientE164, // Will be updated if client exists
          realE164: clientE164,
          providerParticipantSid: clientParticipantSid,
        },
      });
    }
  }

  return {
    sessionSid,
    clientParticipant: {
      participantSid: clientParticipantSid,
      proxyIdentifier,
    },
  };
}
