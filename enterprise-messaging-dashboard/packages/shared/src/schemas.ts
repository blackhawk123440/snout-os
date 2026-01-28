/**
 * Zod schemas for validation
 */

import { z } from 'zod';

export const e164Schema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 format');

export const uuidSchema = z.string().uuid();

export const routingTargetSchema = z.enum(['owner_inbox', 'sitter', 'client']);

export const numberClassSchema = z.enum(['front_desk', 'sitter', 'pool']);

export const numberStatusSchema = z.enum(['active', 'quarantined', 'inactive']);

export const createRoutingOverrideSchema = z.object({
  threadId: uuidSchema,
  target: routingTargetSchema,
  targetId: z.string().optional(),
  durationHours: z.number().min(1).max(8760).optional(), // Max 1 year
  reason: z.string().min(1).max(500),
});

export const simulateRoutingSchema = z.object({
  threadId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  timestamp: z.string().optional(), // ISO string
  direction: z.enum(['inbound', 'outbound']).optional(),
  numberId: uuidSchema.optional(),
});

export const quarantineNumberSchema = z.object({
  numberId: uuidSchema,
  reason: z.enum(['delivery_failures', 'policy_violation', 'manual_review', 'other']),
  reasonDetail: z.string().max(1000).optional(),
});

export const assignNumberSchema = z.object({
  numberId: uuidSchema,
  sitterId: uuidSchema,
});

export const createAssignmentWindowSchema = z.object({
  threadId: uuidSchema,
  sitterId: uuidSchema,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  bookingRef: z.string().optional(),
});

export const sendMessageSchema = z.object({
  threadId: uuidSchema,
  body: z.string().min(1).max(1600),
  forceSend: z.boolean().optional().default(false),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  lane: z.enum(['front_desk', 'sitter', 'billing', 'system']),
  trigger: z.record(z.unknown()),
  conditions: z.array(z.unknown()),
  actions: z.array(z.unknown()),
  templates: z.array(z.unknown()),
});

// ============================================
// Setup Wizard Schemas
// ============================================

export const connectProviderSchema = z.object({
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
});

export const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  providerMode: z.enum(['mock', 'twilio']).optional(),
});

export const providerStatusSchema = z.object({
  connected: z.boolean(),
  providerMode: z.enum(['mock', 'twilio']),
  accountName: z.string().optional(),
  error: z.string().optional(),
});

export const buyNumberSchema = z.object({
  class: numberClassSchema,
  areaCode: z.string().optional(),
  country: z.string().optional().default('US'),
  quantity: z.number().min(1).max(10).default(1),
});

export const buyNumberResponseSchema = z.object({
  success: z.boolean(),
  numbers: z.array(z.object({
    e164: e164Schema,
    numberSid: z.string(),
    cost: z.number().optional(),
  })),
  totalCost: z.number().optional(),
  error: z.string().optional(),
});

export const importNumberSchema = z.object({
  class: numberClassSchema,
  e164s: z.array(e164Schema).optional(),
  numberSids: z.array(z.string()).optional(),
});

export const numbersStatusSchema = z.object({
  frontDesk: z.object({
    count: z.number(),
    numbers: z.array(z.object({
      id: uuidSchema,
      e164: e164Schema,
      status: numberStatusSchema,
    })),
  }),
  sitter: z.object({
    count: z.number(),
    numbers: z.array(z.object({
      id: uuidSchema,
      e164: e164Schema,
      status: numberStatusSchema,
    })),
  }),
  pool: z.object({
    count: z.number(),
    numbers: z.array(z.object({
      id: uuidSchema,
      e164: e164Schema,
      status: numberStatusSchema,
    })),
  }),
  hasFrontDesk: z.boolean(),
});

export const webhookStatusSchema = z.object({
  configured: z.boolean(),
  active: z.boolean(),
  verified: z.boolean(),
  webhookUrl: z.string().optional(),
  error: z.string().optional(),
});

export const readinessCheckSchema = z.object({
  providerConnected: z.boolean(),
  frontDeskNumberConfigured: z.boolean(),
  webhookInstalled: z.boolean(),
  ready: z.boolean(),
  checks: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    error: z.string().optional(),
  })),
});

export const setupProgressSchema = z.object({
  step: z.number().min(1).max(7),
  completedSteps: z.array(z.number()),
  data: z.record(z.unknown()).optional(),
});
