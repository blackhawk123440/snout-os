/**
 * Shared types for SnoutOS Enterprise Messaging Dashboard
 * All types match the database schema and API contracts
 */

export type UserRole = 'owner' | 'sitter' | 'admin_future';

export type NumberClass = 'front_desk' | 'sitter' | 'pool';

export type NumberStatus = 'active' | 'quarantined' | 'inactive';

export type ProviderType = 'twilio' | 'mock';

export type ThreadType = 'front_desk' | 'assignment' | 'pool' | 'other';

export type ThreadStatus = 'active' | 'inactive';

export type MessageDirection = 'inbound' | 'outbound';

export type SenderType = 'client' | 'sitter' | 'owner' | 'system' | 'automation';

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export type PolicyViolationType = 'phone' | 'email' | 'url' | 'social' | 'other';

export type PolicyAction = 'blocked' | 'warned' | 'overridden' | 'allowed';

export type PolicyStatus = 'open' | 'resolved' | 'dismissed';

export type AutomationLane = 'front_desk' | 'sitter' | 'billing' | 'system';

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';

export type AutomationExecutionStatus = 'success' | 'failed' | 'skipped' | 'test';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertStatus = 'open' | 'resolved' | 'dismissed';

export type RoutingTarget = 'owner_inbox' | 'sitter' | 'client';

export type ActorType = 'owner' | 'sitter' | 'client' | 'system' | 'automation';

export interface RoutingDecision {
  target: RoutingTarget;
  targetId?: string;
  reason: string;
  evaluationTrace: RoutingEvaluationStep[];
  rulesetVersion: string;
  evaluatedAt: Date;
  inputsSnapshot: {
    threadId: string;
    timestamp: Date;
    assignmentWindowActive?: boolean;
    overrideActive?: boolean;
    sitterId?: string;
  };
}

export interface RoutingEvaluationStep {
  step: number;
  rule: string;
  condition: string;
  result: boolean;
  explanation: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  actorType: ActorType;
  actorId?: string;
  entityType: string;
  entityId?: string;
  eventType: string;
  ts: Date;
  correlationIds: {
    messageId?: string;
    threadId?: string;
    routingEvalId?: string;
    webhookRequestId?: string;
    automationExecutionId?: string;
    [key: string]: string | undefined;
  };
  payload: Record<string, unknown>;
  schemaVersion: number;
}
