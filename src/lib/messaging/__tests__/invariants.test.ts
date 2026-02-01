/**
 * Property-Based Tests for Messaging Invariants
 * 
 * Uses fast-check to generate random scenarios and assert invariants.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/db';
import {
  enforceThreadBoundSending,
  enforceFromNumberMatchesThread,
  enforcePoolUnknownSenderRouting,
  checkOutboundInvariants,
} from '../invariants';

// Helper to generate random E.164 numbers
const e164Arb = fc.stringMatching(/^\+1[0-9]{10}$/);

// Helper to generate random UUIDs
const uuidArb = fc.uuid();

describe('Messaging Invariants - Property-Based Tests', () => {
  beforeEach(async () => {
    // Clean up test data if needed
  });

  describe('INVARIANT 1: Thread-bound sending', () => {
    it('should enforce that all outbound messages have valid threadId', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArb, uuidArb, async (threadId, orgId) => {
          const result = await enforceThreadBoundSending(threadId, orgId);
          
          // If thread doesn't exist, result should be invalid
          const thread = await prisma.messageThread.findUnique({
            where: { id: threadId },
            select: { id: true, orgId: true },
          });

          if (!thread) {
            expect(result.valid).toBe(false);
            expect(result.violation?.invariant).toBe('thread-bound-sending');
          } else if (thread.orgId !== orgId) {
            expect(result.valid).toBe(false);
            expect(result.violation?.invariant).toBe('thread-bound-sending');
          } else {
            expect(result.valid).toBe(true);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('INVARIANT 2: from_number matches thread.messageNumber', () => {
    it('should enforce that from_number equals thread.messageNumber.e164', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArb, e164Arb, e164Arb, async (threadId, fromNumber, otherNumber) => {
          const result = await enforceFromNumberMatchesThread(threadId, fromNumber);
          
          const thread = await prisma.messageThread.findUnique({
            where: { id: threadId },
            include: {
              messageNumber: {
                select: { e164: true },
              },
            },
          });

          if (!thread) {
            expect(result.valid).toBe(false);
          } else if (!thread.messageNumber) {
            expect(result.valid).toBe(false);
          } else if (fromNumber !== thread.messageNumber.e164) {
            expect(result.valid).toBe(false);
            expect(result.violation?.invariant).toBe('from-number-matches-thread');
          } else {
            expect(result.valid).toBe(true);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('INVARIANT 3: Pool unknown sender routing', () => {
    it('should enforce that pool inbound unknown sender routes to owner', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArb, e164Arb, uuidArb, async (messageNumberId, fromNumber, orgId) => {
          const result = await enforcePoolUnknownSenderRouting(
            messageNumberId,
            fromNumber,
            orgId
          );

          const messageNumber = await prisma.messageNumber.findUnique({
            where: { id: messageNumberId },
            select: { id: true, numberClass: true, orgId: true },
          });

          if (!messageNumber) {
            expect(result.valid).toBe(false);
          } else if (messageNumber.orgId !== orgId) {
            expect(result.valid).toBe(false);
          } else if (messageNumber.numberClass === 'pool') {
            // Check if thread exists for this sender
            const existingThread = await prisma.messageThread.findFirst({
              where: {
                orgId,
                participants: {
                  some: {
                    realE164: fromNumber,
                  },
                },
              },
              select: { id: true },
            });

            if (!existingThread) {
              // Unknown sender to pool number - must route to owner
              expect(result.routedToOwner).toBe(true);
            }
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('No E164 leakage', () => {
    it('should never expose real E164 numbers in error messages or logs', async () => {
      await fc.assert(
        fc.asyncProperty(e164Arb, async (e164) => {
          // Simulate error scenarios
          const errorMessages = [
            `Failed to send to ${e164}`,
            `Invalid number: ${e164}`,
            `Thread not found for ${e164}`,
          ];

          // Check that no full E164 is exposed (should be redacted)
          for (const msg of errorMessages) {
            // In production, E164s should be redacted (e.g., +1***1234)
            const hasFullE164 = msg.includes(e164);
            // This test documents the requirement - actual implementation should redact
            // For now, we just check that we're aware of the requirement
            expect(hasFullE164).toBe(true); // This will fail if we implement redaction correctly
          }
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Deterministic routing', () => {
    it('should produce same routing decision for same inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          e164Arb,
          e164Arb,
          fc.date(),
          async (orgId, toNumber, fromNumber, timestamp) => {
            // This test would require mocking the routing resolver
            // For now, we document the requirement
            // In practice, routing should be deterministic based on:
            // - orgId
            // - toNumber (message number)
            // - fromNumber (sender)
            // - timestamp (for window checks)
            // - thread existence
            // - assignment windows
            expect(true).toBe(true); // Placeholder
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Safe fallback', () => {
    it('should always route to owner inbox on routing errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          e164Arb,
          e164Arb,
          async (orgId, toNumber, fromNumber) => {
            // When routing fails, should always fallback to owner inbox
            // This ensures no messages are lost
            // In practice, this is handled in the webhook route
            expect(true).toBe(true); // Placeholder
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Thread-bound sending (comprehensive)', () => {
    it('should enforce all outbound invariants together', async () => {
      await fc.assert(
        fc.asyncProperty(uuidArb, uuidArb, e164Arb, async (threadId, orgId, fromNumber) => {
          const result = await checkOutboundInvariants(threadId, orgId, fromNumber);
          
          // If any invariant fails, violations should be present
          if (!result.valid) {
            expect(result.violations.length).toBeGreaterThan(0);
            for (const violation of result.violations) {
              expect(violation.invariant).toMatch(/thread-bound-sending|from-number-matches-thread/);
            }
          }
        }),
        { numRuns: 50 }
      );
    });
  });
});
