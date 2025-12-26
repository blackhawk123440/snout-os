/**
 * Pricing Engine
 * 
 * Evaluates pricing rules and applies fees, discounts, and multipliers
 * to booking calculations.
 */

import { prisma } from "@/lib/db";

interface PricingContext {
  service: string;
  startAt: Date;
  endAt: Date;
  petCount: number;
  quantity: number;
  afterHours: boolean;
  holiday: boolean;
  bookingTotal?: number;
  dayOfWeek?: number; // 0 = Sunday, 6 = Saturday
  hour?: number; // 0-23
  zipCode?: string;
  clientTags?: string[];
  sitterTags?: string[];
  [key: string]: any; // Allow custom fields
}

interface PricingResult {
  basePrice: number;
  fees: Array<{ name: string; amount: number }>;
  discounts: Array<{ name: string; amount: number }>;
  multipliers: Array<{ name: string; multiplier: number }>;
  subtotal: number;
  total: number;
}

/**
 * Evaluate a single pricing rule condition
 */
function evaluateCondition(
  condition: any,
  context: PricingContext
): boolean {
  const { field, operator, value } = condition;
  const contextValue = getNestedValue(context, field);

  if (contextValue === undefined || contextValue === null) {
    return false;
  }

  switch (operator) {
    case "equals":
      return contextValue === value;
    case "notEquals":
      return contextValue !== value;
    case "contains":
      return String(contextValue).toLowerCase().includes(String(value).toLowerCase());
    case "greaterThan":
      return Number(contextValue) > Number(value);
    case "lessThan":
      return Number(contextValue) < Number(value);
    case "greaterThanOrEqual":
      return Number(contextValue) >= Number(value);
    case "lessThanOrEqual":
      return Number(contextValue) <= Number(value);
    case "in":
      const valueArray = Array.isArray(value) ? value : JSON.parse(value || "[]");
      return Array.isArray(valueArray) && valueArray.includes(contextValue);
    case "notIn":
      const notInArray = Array.isArray(value) ? value : JSON.parse(value || "[]");
      return Array.isArray(notInArray) && !notInArray.includes(contextValue);
    default:
      return false;
  }
}

/**
 * Evaluate all conditions with AND/OR logic
 */
function evaluateConditions(
  conditions: any[],
  context: PricingContext
): boolean {
  if (conditions.length === 0) {
    return true;
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
 * Apply a pricing rule calculation
 */
function applyCalculation(
  calculation: any,
  context: PricingContext,
  currentTotal: number
): number {
  const { type, value, valueType, minValue, maxValue } = calculation;

  let result = 0;

  switch (type) {
    case "fixed":
      result = Number(value) || 0;
      break;
    
    case "percentage":
      result = (currentTotal * Number(value)) / 100;
      break;
    
    case "multiplier":
      result = currentTotal * Number(value);
      break;
    
    case "perUnit":
      const unitCount = getNestedValue(context, calculation.unitField || "quantity") || 1;
      result = Number(value) * unitCount;
      break;
    
    case "formula":
      // Simple formula evaluation (can be extended)
      try {
        const formula = String(value)
          .replace(/\{\{total\}\}/g, String(currentTotal))
          .replace(/\{\{petCount\}\}/g, String(context.petCount || 0))
          .replace(/\{\{quantity\}\}/g, String(context.quantity || 1));
        result = eval(formula); // In production, use a safer formula evaluator
      } catch {
        result = 0;
      }
      break;
    
    default:
      result = 0;
  }

  // Apply min/max constraints
  if (minValue !== undefined && result < minValue) {
    result = minValue;
  }
  if (maxValue !== undefined && result > maxValue) {
    result = maxValue;
  }

  return result;
}

/**
 * Calculate final price with all pricing rules applied
 */
export async function calculatePriceWithRules(
  basePrice: number,
  context: PricingContext
): Promise<PricingResult> {
  // Get all enabled pricing rules, ordered by priority
  const rules = await prisma.pricingRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" },
  });

  // Enrich context with additional data
  const enrichedContext: PricingContext = {
    ...context,
    bookingTotal: basePrice,
    dayOfWeek: context.startAt.getDay(),
    hour: context.startAt.getHours(),
  };

  const fees: Array<{ name: string; amount: number }> = [];
  const discounts: Array<{ name: string; amount: number }> = [];
  const multipliers: Array<{ name: string; multiplier: number }> = [];

  let currentTotal = basePrice;

  // Process rules in priority order
  for (const rule of rules) {
    try {
      const conditions = JSON.parse(rule.conditions || "[]");
      const calculation = JSON.parse(rule.calculation || "{}");

      // Check if conditions are met
      if (!evaluateConditions(conditions, enrichedContext)) {
        continue;
      }

      // Apply calculation based on rule type
      if (rule.type === "fee") {
        const feeAmount = applyCalculation(calculation, enrichedContext, currentTotal);
        fees.push({ name: rule.name, amount: feeAmount });
        currentTotal += feeAmount;
      } else if (rule.type === "discount") {
        const discountAmount = applyCalculation(calculation, enrichedContext, currentTotal);
        discounts.push({ name: rule.name, amount: discountAmount });
        currentTotal -= discountAmount;
      } else if (rule.type === "multiplier") {
        const multiplier = Number(calculation.value) || 1;
        multipliers.push({ name: rule.name, multiplier });
        currentTotal *= multiplier;
      }

      // Update context for next rule evaluation
      enrichedContext.bookingTotal = currentTotal;
    } catch (error) {
      console.error(`Error processing pricing rule ${rule.id}:`, error);
      // Continue with next rule
    }
  }

  // Ensure total is not negative
  if (currentTotal < 0) {
    currentTotal = 0;
  }

  return {
    basePrice,
    fees,
    discounts,
    multipliers,
    subtotal: basePrice + fees.reduce((sum, f) => sum + f.amount, 0),
    total: currentTotal,
  };
}


