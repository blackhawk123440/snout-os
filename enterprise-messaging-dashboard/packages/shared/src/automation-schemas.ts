/**
 * Automation Builder Schemas
 * 
 * Shared Zod schemas for automation trigger, conditions, actions, and templates
 */

import { z } from 'zod';

// Trigger Types
export const triggerTypeSchema = z.enum([
  'booking_created',
  'thread_created',
  'message_received',
  'assignment_window_started',
]);

export type TriggerType = z.infer<typeof triggerTypeSchema>;

// Trigger Configs
export const bookingCreatedTriggerSchema = z.object({
  type: z.literal('booking_created'),
  bookingStatus: z.enum(['pending', 'confirmed', 'completed']).optional(),
});

export const threadCreatedTriggerSchema = z.object({
  type: z.literal('thread_created'),
  threadType: z.enum(['front_desk', 'assignment', 'pool']).optional(),
});

export const messageReceivedTriggerSchema = z.object({
  type: z.literal('message_received'),
  direction: z.enum(['inbound', 'outbound']).optional(),
  senderType: z.enum(['client', 'sitter', 'owner']).optional(),
});

export const assignmentWindowStartedTriggerSchema = z.object({
  type: z.literal('assignment_window_started'),
  sitterId: z.string().optional(),
});

export const triggerConfigSchema = z.discriminatedUnion('type', [
  bookingCreatedTriggerSchema,
  threadCreatedTriggerSchema,
  messageReceivedTriggerSchema,
  assignmentWindowStartedTriggerSchema,
]);

export type TriggerConfig = z.infer<typeof triggerConfigSchema>;

// Conditions
export const conditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
]);

export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;

export const conditionSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: conditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export type Condition = z.infer<typeof conditionSchema>;

export const conditionGroupSchema = z.object({
  operator: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(conditionSchema).min(1, 'At least one condition required'),
});

export type ConditionGroup = z.infer<typeof conditionGroupSchema>;

export const conditionsSchema = z.object({
  groups: z.array(conditionGroupSchema).min(1, 'At least one condition group required').optional(),
  // For simple cases, allow flat array
  conditions: z.array(conditionSchema).optional(),
}).refine(
  (data) => (data.groups && data.groups.length > 0) || (data.conditions && data.conditions.length > 0),
  { message: 'At least one condition or condition group is required' },
);

export type Conditions = z.infer<typeof conditionsSchema>;

// Actions
export const sendSMSActionSchema = z.object({
  type: z.literal('send_sms'),
  recipient: z.enum(['client', 'sitter', 'owner']),
  templateKey: z.string().min(1, 'Template key is required'),
  // Note: from_number is always thread's business number (enforced by backend)
});

export const actionSchema = z.discriminatedUnion('type', [
  sendSMSActionSchema,
]);

export type Action = z.infer<typeof actionSchema>;

export const actionsSchema = z.array(actionSchema).min(1, 'At least one action is required');

// Templates
export const templatesSchema = z.record(z.string()).refine(
  (templates) => Object.keys(templates).length > 0,
  { message: 'At least one template is required' },
);

export type Templates = z.infer<typeof templatesSchema>;

// Full Automation Schema
export const automationBuilderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  lane: z.enum(['front_desk', 'sitter', 'billing', 'system']),
  trigger: triggerConfigSchema,
  conditions: conditionsSchema.optional(),
  actions: actionsSchema,
  templates: templatesSchema,
});

export type AutomationBuilder = z.infer<typeof automationBuilderSchema>;

// Helper functions for human-readable descriptions
export function describeTrigger(trigger: TriggerConfig): string {
  switch (trigger.type) {
    case 'booking_created':
      return `When booking is created${trigger.bookingStatus ? ` (status: ${trigger.bookingStatus})` : ''}`;
    case 'thread_created':
      return `When thread is created${trigger.threadType ? ` (type: ${trigger.threadType})` : ''}`;
    case 'message_received':
      return `When message is received${trigger.direction ? ` (${trigger.direction})` : ''}${trigger.senderType ? ` from ${trigger.senderType}` : ''}`;
    case 'assignment_window_started':
      return `When assignment window starts${trigger.sitterId ? ` for sitter ${trigger.sitterId}` : ''}`;
    default:
      return 'Unknown trigger';
  }
}

export function describeCondition(condition: Condition): string {
  const field = condition.field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const operator = {
    equals: 'equals',
    not_equals: 'does not equal',
    contains: 'contains',
    greater_than: 'is greater than',
    less_than: 'is less than',
  }[condition.operator];
  return `${field} ${operator} ${condition.value}`;
}

export function describeAction(action: Action): string {
  switch (action.type) {
    case 'send_sms':
      return `Send SMS to ${action.recipient} using template "${action.templateKey}"`;
    default:
      return `Execute ${action.type}`;
  }
}
