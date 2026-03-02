/**
 * Tenant-owned Prisma models (those with orgId).
 * ALL reads/writes for these models MUST be org-scoped.
 */

export const TENANT_MODELS = [
  'booking',
  'client',
  'pet',
  'timeSlot',
  'sitter',
  'sitterPoolOffer',
  'bookingSitterPool',
  'message',
  'report',
  'automation',
  'automationRun',
  'automationRunStep',
  'customFieldValue',
  'discountUsage',
  'eventLog',
  'bookingStatusHistory',
  'stripeCharge',
  // StripeRefund, StripePayout, StripeBalanceTransaction, PayrollRun, PayrollLineItem, PayrollAdjustment: no orgId in schema
  'messageAccount',
  'messageNumber',
  'providerCredential',
  'messageThread',
  'messageParticipant',
  'messageEvent',
  'threadAssignmentAudit',
  'optOutState',
  'responseRecord',
  'sitterMaskedNumber',
  'assignmentWindow',
  'antiPoachingAttempt',
  'sitterTierSnapshot',
  'sitterServiceEvent',
  'sitterTimeOff',
  'offerEvent',
  'visitEvent',
  'sitterCompensation',
  'sitterMetricsWindow',
  'messageResponseLink',
  'bookingCalendarEvent',
  'loyaltyReward',
  'petHealthLog',
  'analyticsInsight',
  'baselineSnapshot',
  'user',
  'bookingTagAssignment',
] as const;

export type TenantModelName = (typeof TENANT_MODELS)[number];

export function isTenantModel(modelName: string): modelName is TenantModelName {
  return (TENANT_MODELS as readonly string[]).includes(modelName);
}
