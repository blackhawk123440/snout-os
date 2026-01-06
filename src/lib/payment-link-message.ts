/**
 * Payment Link Message Template
 * 
 * Priority 1: Centralized payment link message template
 * Uses Leah's standard message format with variable substitution
 */

import { getMessageTemplate, replaceTemplateVariables } from "./automation-utils";

/**
 * Get payment link message template
 * Falls back to default Leah template if not configured
 */
export async function getPaymentLinkMessageTemplate(): Promise<string> {
  // Try to get custom template from database
  const template = await getMessageTemplate("paymentReminder", "client");
  
  if (template && template.trim() !== "") {
    return template;
  }
  
  // Default Leah template
  return `💳 PAYMENT REMINDER\n\nHi {{firstName}},\n\nYour {{service}} booking on {{date}} is ready for payment.\n\nPets: {{petQuantities}}\nTotal: {{total}}\n\nPay now: {{paymentLink}}`;
}

/**
 * Generate payment link message with variables filled
 */
export async function generatePaymentLinkMessage(
  firstName: string,
  service: string,
  date: string,
  petQuantities: string,
  total: number,
  paymentLink: string
): Promise<string> {
  const template = await getPaymentLinkMessageTemplate();
  
  return replaceTemplateVariables(template, {
    firstName,
    service,
    date,
    petQuantities,
    total: total.toFixed(2),
    paymentLink,
  });
}

