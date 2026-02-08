/**
 * Automation Engine
 * 
 * Processes automations when events are emitted.
 * This is the core of the Unified Automation Center.
 */

import { prisma } from "@/lib/db";
import { eventEmitter } from "./event-emitter";
import { sendMessage } from "./message-utils";
import { replaceTemplateVariables } from "./automation-utils";
import { getSitterPhone, getOwnerPhone } from "./phone-utils";
import { formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage, formatClientNameForSitter, calculatePriceBreakdown, formatPetsByQuantity } from "./booking-utils";

type EventType = string;
type EventContext = Record<string, any>;

interface AutomationCondition {
  field: string;
  operator: string;
  value: string;
  logic?: string;
}

interface AutomationAction {
  type: string;
  config: string;
  delayMinutes?: number;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: AutomationCondition,
  context: EventContext
): boolean {
  const { field, operator, value } = condition;
  const contextValue = getNestedValue(context, field);

  if (contextValue === undefined || contextValue === null) {
    return false;
  }

  const conditionValue = parseValue(value);
  const contextVal = parseValue(contextValue);

  switch (operator) {
    case "equals":
      return contextVal === conditionValue;
    case "notEquals":
      return contextVal !== conditionValue;
    case "contains":
      return String(contextVal).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "notContains":
      return !String(contextVal).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "greaterThan":
      return Number(contextVal) > Number(conditionValue);
    case "lessThan":
      return Number(contextVal) < Number(conditionValue);
    case "greaterThanOrEqual":
      return Number(contextVal) >= Number(conditionValue);
    case "lessThanOrEqual":
      return Number(contextVal) <= Number(conditionValue);
    case "in":
      const valueArray = JSON.parse(value || "[]");
      return Array.isArray(valueArray) && valueArray.includes(contextVal);
    case "notIn":
      const notInArray = JSON.parse(value || "[]");
      return Array.isArray(notInArray) && !notInArray.includes(contextVal);
    case "isEmpty":
      return !contextVal || String(contextVal).trim() === "";
    case "isNotEmpty":
      return contextVal && String(contextVal).trim() !== "";
    default:
      return false;
  }
}

/**
 * Evaluate all conditions with AND/OR logic
 */
function evaluateConditions(
  conditions: AutomationCondition[],
  context: EventContext
): boolean {
  if (conditions.length === 0) {
    return true; // No conditions = always true
  }

  let result = evaluateCondition(conditions[0], context);

  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateCondition(condition, context);
    const logic = conditions[i - 1].logic || "AND";

    if (logic === "AND") {
      result = result && conditionResult;
    } else if (logic === "OR") {
      result = result || conditionResult;
    }
  }

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Parse value (handle JSON, numbers, booleans)
 */
function parseValue(value: any): any {
  if (typeof value === "string") {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Not JSON, return as string
      return value;
    }
  }
  return value;
}

/**
 * Execute an automation action
 */
async function executeAction(
  action: AutomationAction,
  context: EventContext,
  automationId: string
): Promise<{ success: boolean; error?: string; result?: any }> {
  const config = JSON.parse(action.config || "{}");
  const delay = action.delayMinutes || 0;

  // Apply delay if specified
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay * 60 * 1000));
  }

  try {
    switch (action.type) {
      case "sendSMS":
        return await executeSendSMS(config, context);
      
      case "sendEmail":
        return await executeSendEmail(config, context);
      
      case "updateBookingStatus":
        return await executeUpdateBookingStatus(config, context);
      
      case "assignSitter":
        return await executeAssignSitter(config, context);
      
      case "unassignSitter":
        return await executeUnassignSitter(config, context);
      
      case "applyFee":
        return await executeApplyFee(config, context);
      
      case "applyDiscount":
        return await executeApplyDiscount(config, context);
      
      case "createInternalTask":
        return await executeCreateInternalTask(config, context);
      
      case "requestReview":
        return await executeRequestReview(config, context);
      
      case "notifyOwner":
        return await executeNotifyOwner(config, context);
      
      case "pushCalendarUpdate":
        return await executePushCalendarUpdate(config, context);
      
      case "fireWebhook":
        return await executeFireWebhook(config, context);
      
      case "toggleSitterAvailability":
        return await executeToggleSitterAvailability(config, context);
      
      case "writeInternalNote":
        return await executeWriteInternalNote(config, context);
      
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Action implementations
 */
async function executeSendSMS(config: any, context: EventContext): Promise<{ success: boolean; error?: string; result?: any }> {
  const { recipient, template, phone } = config;
  
  let targetPhone: string | null = null;
  
  if (phone) {
    targetPhone = phone;
  } else if (recipient === "client") {
    targetPhone = context.clientPhone || context.booking?.phone;
  } else if (recipient === "sitter") {
    targetPhone = await getSitterPhone(context.sitterId || context.sitter?.id);
  } else if (recipient === "owner") {
    targetPhone = await getOwnerPhone(context.bookingId, "automation");
  }

  if (!targetPhone) {
    return { success: false, error: "No phone number found for recipient" };
  }

  // Build variables for template replacement
  const variables = buildTemplateVariables(context, recipient === "sitter");
  
  const message = replaceTemplateVariables(template, variables, {
    isSitterMessage: recipient === "sitter",
    sitterCommissionPercentage: context.sitter?.commissionPercentage || 80,
  });

  const result = await sendMessage(targetPhone, message, context.bookingId);
  
  return { success: true, result };
}

async function executeSendEmail(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement email sending
  console.log("Email sending not yet implemented", config, context);
  return { success: false, error: "Email sending not yet implemented" };
}

async function executeUpdateBookingStatus(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // Note: Booking model not available in messaging dashboard schema
  // This function is for the original booking system only
  return { success: false, error: "Booking model not available in messaging dashboard" };
}

async function executeAssignSitter(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // Note: Booking model not available in messaging dashboard schema
  // This function is for the original booking system only
  return { success: false, error: "Booking model not available in messaging dashboard" };
}

async function executeUnassignSitter(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // Note: Booking model not available in messaging dashboard schema
  // This function is for the original booking system only
  return { success: false, error: "Booking model not available in messaging dashboard" };
}

async function executeApplyFee(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement fee application
  console.log("Fee application not yet implemented", config, context);
  return { success: false, error: "Fee application not yet implemented" };
}

async function executeApplyDiscount(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement discount application
  console.log("Discount application not yet implemented", config, context);
  return { success: false, error: "Discount application not yet implemented" };
}

async function executeCreateInternalTask(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement task creation
  console.log("Task creation not yet implemented", config, context);
  return { success: false, error: "Task creation not yet implemented" };
}

async function executeRequestReview(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement review request
  console.log("Review request not yet implemented", config, context);
  return { success: false, error: "Review request not yet implemented" };
}

async function executeNotifyOwner(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  const { message } = config;
  const ownerPhone = await getOwnerPhone(context.bookingId, "automation");
  
  if (!ownerPhone) {
    return { success: false, error: "Owner phone not found" };
  }

  const variables = buildTemplateVariables(context, false);
  const formattedMessage = replaceTemplateVariables(message || "Automation notification", variables);
  
  await sendMessage(ownerPhone, formattedMessage, context.bookingId);
  
  return { success: true };
}

async function executePushCalendarUpdate(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement calendar update
  console.log("Calendar update not yet implemented", config, context);
  return { success: false, error: "Calendar update not yet implemented" };
}

async function executeFireWebhook(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  const { url, method = "POST", headers = {} } = config;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeToggleSitterAvailability(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  const { sitterId, available } = config;
  const targetSitterId = sitterId || context.sitterId || context.sitter?.id;
  
  if (!targetSitterId) {
    return { success: false, error: "No sitter ID found" };
  }

  await prisma.sitter.update({
    where: { id: targetSitterId },
    data: { active: available !== false },
  });

  return { success: true };
}

async function executeWriteInternalNote(config: any, context: EventContext): Promise<{ success: boolean; error?: string }> {
  const { note } = config;
  const bookingId = context.bookingId || context.booking?.id;
  
  if (!bookingId) {
    return { success: false, error: "No booking ID found" };
  }

  // Note: Booking model not available in messaging dashboard schema
  // This function is for the original booking system only
  return { success: false, error: "Booking model not available in messaging dashboard" };
}

/**
 * Build template variables from context
 */
function buildTemplateVariables(context: EventContext, isSitterMessage: boolean): Record<string, string | number> {
  const booking = context.booking || {};
  const sitter = context.sitter || {};
  const clientName = isSitterMessage && booking.firstName && booking.lastName
    ? formatClientNameForSitter(booking.firstName, booking.lastName)
    : `${booking.firstName || ""} ${booking.lastName || ""}`.trim();

  // Calculate the true total price instead of using stored value
  let calculatedTotal = 0;
  try {
    if (booking.service && booking.startAt && booking.endAt && booking.pets) {
      const { calculatePriceBreakdown } = require("./booking-utils");
      const breakdown = calculatePriceBreakdown({
        service: booking.service,
        startAt: booking.startAt,
        endAt: booking.endAt,
        pets: booking.pets || [],
        quantity: booking.quantity || 1,
        afterHours: booking.afterHours || false,
        holiday: booking.holiday || false,
        timeSlots: booking.timeSlots || [],
      });
      calculatedTotal = breakdown.total;
    } else if (booking.totalPrice) {
      // Fallback to stored if we can't calculate
      calculatedTotal = booking.totalPrice;
    }
  } catch (error) {
    // If calculation fails, use stored value as fallback
    calculatedTotal = booking.totalPrice || context.totalPrice || 0;
  }

  const variables: Record<string, string | number> = {
    clientName,
    firstName: booking.firstName || "",
    lastName: isSitterMessage && booking.lastName
      ? booking.lastName.charAt(0).toUpperCase()
      : booking.lastName || "",
    sitterName: `${sitter.firstName || ""} ${sitter.lastName || ""}`.trim(),
    service: booking.service || context.service || "",
    totalPrice: calculatedTotal,
    total: calculatedTotal,
    status: booking.status || context.status || "",
    address: booking.address || "",
    phone: booking.phone || context.clientPhone || "",
    email: booking.email || context.clientEmail || "",
  };

  // Add dates and times if booking has timeSlots
  if (booking.timeSlots && Array.isArray(booking.timeSlots)) {
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots,
    });
    variables.datesTimes = formattedDatesTimes;
    variables.schedule = formattedDatesTimes;
    variables.visits = formattedDatesTimes;
  }

  if (booking.startAt) {
    variables.date = formatDateForMessage(new Date(booking.startAt));
    variables.time = formatTimeForMessage(new Date(booking.startAt));
  }

  // Add pet information
  if (booking.pets && Array.isArray(booking.pets)) {
    variables.petQuantities = formatPetsByQuantity(booking.pets);
    variables.petNames = booking.pets.map((p: any) => p.name).join(", ");
  }

  return variables;
}

/**
 * Process automations for a given event
 */
export async function processAutomations(
  eventType: EventType,
  context: EventContext
): Promise<void> {
  // Note: This automation engine is for the original booking system
  // The messaging dashboard uses a different automation system (handled by NestJS API)
  // For messaging-only deployments, automations are processed by the API's AutomationWorker
  // This function is disabled when using the messaging dashboard schema
  
  // Fetch all active automations and filter by trigger type in JavaScript
  // (since trigger is a JSON field, not a relation)
  const allAutomations = await prisma.automation.findMany({
    where: {
      status: 'active',
    },
  });

  // Filter automations where trigger JSON matches eventType
  const automations = allAutomations.filter((automation) => {
    try {
      const trigger = automation.trigger as any;
      return trigger?.triggerType === eventType;
    } catch {
      return false;
    }
  });

  // Note: Full automation processing is handled by NestJS API's AutomationWorker
  // This Web service automation engine is for the original booking system only
  // For messaging dashboard, automations are processed server-side by the API
  if (automations.length > 0) {
    console.log(`[AutomationEngine] Found ${automations.length} automations for event ${eventType}, but processing is handled by NestJS API`);
  }
  
  return; // Early return - automations handled by API
}

/**
 * Log automation execution
 */
async function logAutomationExecution(
  automationId: string,
  trigger: string,
  context: EventContext,
  conditionGroups: any[],
  actions: any[],
  success: boolean,
  error: string | null
): Promise<void> {
  // Note: Automation execution logging is handled by NestJS API
  // This function is disabled when using the messaging dashboard schema
  // (automationRun and eventLog models don't exist in API schema)
  console.log(`[AutomationEngine] Would log execution for automation ${automationId}, but logging is handled by NestJS API`);
}

/**
 * Initialize automation engine - subscribe to events
 */
export function initializeAutomationEngine(): void {
  // Subscribe to all events
  eventEmitter.onAll(async (context: any) => {
    const eventType = context.eventType;
    if (eventType) {
      await processAutomations(eventType, context);
    }
  });
}

