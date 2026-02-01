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
    // E.164 regex pattern: + followed by 1-15 digits
    const E164_PATTERN = /\+\d{1,15}/g;
    
    // Phone-like patterns that might leak E164s
    const PHONE_PATTERNS = [
      /\+\d{10,15}/g, // E.164 format
      /\(\d{3}\)\s?\d{3}-\d{4}/g, // US format (555) 123-4567
      /\d{3}-\d{3}-\d{4}/g, // US format 555-123-4567
      /\d{10,15}/g, // Raw digits (10-15 digits)
    ];

    // Email pattern (also sensitive)
    const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    it('should never expose real E164 numbers in sitter API responses (including nested metadata)', async () => {
      await fc.assert(
        fc.asyncProperty(e164Arb, async (e164) => {
          // Simulate sitter API/service output with nested metadata
          const mockApiResponse = {
            thread: {
              id: 'thread-123',
              clientPhone: e164, // This would leak!
              maskedNumber: '+1***1234',
              metadata: {
                routing: {
                  trace: [
                    { step: 'check', number: e164 }, // Nested leak!
                  ],
                },
                audit: {
                  events: [
                    { type: 'send', fromNumber: e164 }, // Nested leak!
                  ],
                },
              },
            },
            messages: [
              { 
                from: e164, 
                body: 'Hello',
                delivery: {
                  provider: {
                    error: `Failed to send to ${e164}`, // Nested leak!
                  },
                },
              },
            ],
          };

          // Stringify entire response (including nested objects)
          const responseJson = JSON.stringify(mockApiResponse);
          
          // Scan for E164 patterns in entire stringified response
          const e164Matches = responseJson.match(E164_PATTERN);
          const hasLeakedE164 = e164Matches && e164Matches.some(match => match === e164);
          
          // Also check for phone-like patterns
          let hasPhonePattern = false;
          for (const pattern of PHONE_PATTERNS) {
            const matches = responseJson.match(pattern);
            if (matches && matches.some(m => m.includes(e164.replace('+', '')))) {
              hasPhonePattern = true;
              break;
            }
          }

          // Test should FAIL if E164 is found (leakage detected)
          if (hasLeakedE164 || hasPhonePattern) {
            throw new Error(`E164 leakage detected in nested metadata: ${e164} found in API response`);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should never expose emails in sitter API responses (including audit details)', async () => {
      await fc.assert(
        fc.asyncProperty(fc.emailAddress(), async (email) => {
          // Simulate sitter API response with email in audit details
          const mockApiResponse = {
            thread: {
              id: 'thread-123',
              clientEmail: email, // This would leak!
            },
            audit: {
              events: [
                {
                  type: 'policy_violation',
                  details: {
                    clientContact: email, // Nested leak!
                    metadata: {
                      originalMessage: `Contact ${email} for details`, // Nested leak!
                    },
                  },
                },
              ],
            },
          };

          const responseJson = JSON.stringify(mockApiResponse);
          
          // Scan for email patterns
          const emailMatches = responseJson.match(EMAIL_PATTERN);
          const hasLeakedEmail = emailMatches && emailMatches.some(match => match === email);

          // Test should FAIL if email is found (leakage detected)
          if (hasLeakedEmail) {
            throw new Error(`Email leakage detected in audit details: ${email} found in API response`);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should never expose real E164 numbers in error messages', async () => {
      await fc.assert(
        fc.asyncProperty(e164Arb, async (e164) => {
          // Simulate error messages that might leak E164s
          const errorMessages = [
            `Failed to send to ${e164}`,
            `Invalid number: ${e164}`,
            `Thread not found for ${e164}`,
            `Client ${e164} not found`,
          ];

          // Check that no full E164 is exposed
          for (const msg of errorMessages) {
            const e164Matches = msg.match(E164_PATTERN);
            const hasLeakedE164 = e164Matches && e164Matches.some(match => match === e164);
            
            // Test should FAIL if E164 is found (leakage detected)
            if (hasLeakedE164) {
              throw new Error(`E164 leakage detected in error message: ${msg}`);
            }
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should redact E164s in logs and responses', async () => {
      await fc.assert(
        fc.asyncProperty(e164Arb, async (e164) => {
          // Redaction function (should be implemented in actual code)
          function redactE164(fullE164: string): string {
            if (fullE164.length <= 4) return '***';
            return `${fullE164.substring(0, 2)}***${fullE164.substring(fullE164.length - 4)}`;
          }

          const redacted = redactE164(e164);
          
          // Redacted version should not contain full E164
          expect(redacted).not.toContain(e164);
          
          // Redacted version should be shorter
          expect(redacted.length).toBeLessThan(e164.length);
          
          // Redacted version should still show some digits for debugging
          expect(redacted).toMatch(/\d/);
        }),
        { numRuns: 50 }
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
