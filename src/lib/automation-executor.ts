/**
 * Automation Executor
 * 
 * Executes automation logic for a specific automation type and recipient.
 * This is called by the automation worker after jobs are enqueued.
 * 
 * Per Master Spec Line 6.2.3: Each automation run writes an EventLog record
 */

import { prisma } from "./db";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "./automation-utils";
import { sendMessage } from "./message-utils";
import { getOwnerPhone, getSitterPhone } from "./phone-utils";
import { sendAutomationMessageViaThread } from "./bookings/automation-thread-sender";
import { onBookingConfirmed } from "./bookings/booking-confirmed-handler";
import { 
  formatDatesAndTimesForMessage, 
  formatDateForMessage, 
  formatTimeForMessage, 
  formatClientNameForSitter,
  formatPetsByQuantity,
  calculatePriceBreakdown
} from "./booking-utils";

export interface AutomationContext {
  bookingId?: string;
  sitterId?: string;
  [key: string]: any;
}

export interface AutomationResult {
  success: boolean;
  message?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Execute an automation for a specific recipient
 */
export async function executeAutomationForRecipient(
  automationType: string,
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext
): Promise<AutomationResult> {
  // Check if automation should run for this recipient
  const shouldSend = await shouldSendToRecipient(automationType, recipient);
  
  if (!shouldSend) {
    return {
      success: true,
      message: `Automation ${automationType} skipped for ${recipient} (disabled in settings)`,
      metadata: { skipped: true },
    };
  }

  let booking: any = null;
  if (context.bookingId) {
    booking = await prisma.booking.findUnique({
      where: { id: context.bookingId },
      include: {
        pets: true,
        timeSlots: true,
        sitter: true,
        client: true,
      },
    });
    if (!booking) {
      return {
        success: false,
        error: `Booking not found: ${context.bookingId}`,
      };
    }
  }

  // Execute based on automation type and recipient
  switch (automationType) {
    case "ownerNewBookingAlert":
      return await executeOwnerNewBookingAlert(recipient, context, booking);
    
    case "bookingConfirmation":
      return await executeBookingConfirmation(recipient, context, booking);
    
    case "nightBeforeReminder":
      return await executeNightBeforeReminder(recipient, context, booking);
    
    case "sitterAssignment":
      return await executeSitterAssignment(recipient, context, booking);
    
    case "paymentReminder":
      return await executePaymentReminder(recipient, context, booking);
    
    case "postVisitThankYou":
      return await executePostVisitThankYou(recipient, context, booking);
    
    default:
      return {
        success: false,
        error: `Unknown automation type: ${automationType}`,
      };
  }
}

/**
 * Execute owner new booking alert
 */
async function executeOwnerNewBookingAlert(
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext,
  booking: any
): Promise<AutomationResult> {
  if (!booking) {
    return { success: false, error: "Booking required for ownerNewBookingAlert" };
  }

  if (recipient === "client") {
    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    let template = await getMessageTemplate("ownerNewBookingAlert", "client");
    if (!template || template.trim() === "") {
      template = "🐾 BOOKING RECEIVED!\n\nHi {{firstName}},\n\nWe've received your {{service}} booking request:\n{{datesTimes}}\n\nPets: {{petQuantities}}\n\nWe'll confirm your booking shortly. Thank you!";
    }

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
    });

    // Phase 3: Send via thread masking number
    const orgId = booking.orgId || 'default';
    const result = await sendAutomationMessageViaThread({
      bookingId: booking.id,
      orgId,
      clientId: booking.clientId || '',
      message,
      recipient: 'client',
      recipientPhone: booking.phone,
    });
    
    if (!result.success && result.usedThread === false) {
      // Thread not found - log audit warning
      // Note: eventLog model doesn't exist in enterprise-messaging-dashboard schema
      console.warn('[Automation] Thread not found, using fallback', {
        eventType: 'automation.fallback',
        status: 'warning',
        bookingId: booking.id,
        error: 'Thread not found, used fallback sendMessage',
        automationType: 'ownerNewBookingAlert',
        recipient: 'client',
        reason: 'Thread not found for booking',
      });
    }
    
    return {
      success: result.success,
      message: result.success ? "Client notification sent" : result.error || "Failed to send client notification",
      metadata: { recipient: "client", phone: booking.phone, usedThread: result.usedThread },
    };
  }

  if (recipient === "owner") {
    const ownerPhone = await getOwnerPhone(booking.id, "ownerNewBookingAlert");
    if (!ownerPhone) {
      return { success: false, error: "Owner phone not found" };
    }

    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${booking.id}`;

    let template = await getMessageTemplate("ownerNewBookingAlert", "owner");
    if (!template || template.trim() === "") {
      template = "📱 NEW BOOKING!\n\n{{firstName}} {{lastName}}\n{{phone}}\n\n{{service}}\n{{datesTimes}}\n{{petQuantities}}\nTotal: ${{totalPrice}}\n\nView details: {{bookingUrl}}";
    }

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

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      lastName: booking.lastName,
      phone: booking.phone,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
      totalPrice: breakdown.total.toFixed(2),
      bookingUrl: bookingDetailsUrl,
    });

    // Phase 3: Owner notifications don't use thread (no booking context for owner)
    // Keep old sendMessage for owner notifications
    const sent = await sendMessage(ownerPhone, message, booking.id);
    
    return {
      success: sent,
      message: sent ? "Owner notification sent" : "Failed to send owner notification",
      metadata: { recipient: "owner", phone: ownerPhone },
    };
  }

  return { success: false, error: `Unsupported recipient for ownerNewBookingAlert: ${recipient}` };
}

/**
 * Execute booking confirmation
 * Phase 3.4: Implemented - sends confirmation message when booking is confirmed
 */
async function executeBookingConfirmation(
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext,
  booking: any
): Promise<AutomationResult> {
  if (!booking) {
    return { success: false, error: "Booking required for bookingConfirmation" };
  }

  if (recipient === "client") {
    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    let template = await getMessageTemplate("bookingConfirmation", "client");
    if (!template || template.trim() === "") {
      template = "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\nWe'll see you soon!";
    }

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

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
      totalPrice: breakdown.total.toFixed(2),
      total: breakdown.total.toFixed(2),
    });

    // Phase 3: Send via thread masking number
    const orgId = booking.orgId || 'default'; // TODO: Get actual orgId
    const result = await sendAutomationMessageViaThread({
      bookingId: booking.id,
      orgId,
      clientId: booking.clientId || '',
      message,
      recipient: 'client',
      recipientPhone: booking.phone, // Fallback
    });
    
    const sent = result.success;
    
    return {
      success: sent,
      message: sent ? "Booking confirmation sent to client" : result.error || "Failed to send booking confirmation",
      metadata: { 
        recipient: "client", 
        phone: booking.phone,
        usedThread: result.usedThread || false,
      },
    };
  }

  // Owner notifications for booking confirmation are optional
  if (recipient === "owner") {
    const ownerPhone = await getOwnerPhone(booking.id, "bookingConfirmation");
    if (!ownerPhone) {
      return { success: false, error: "Owner phone not found" };
    }

    let template = await getMessageTemplate("bookingConfirmation", "owner");
    if (!template || template.trim() === "") {
      template = "✅ BOOKING CONFIRMED\n\n{{firstName}} {{lastName}}'s {{service}} booking has been confirmed.\n\n{{datesTimes}}";
    }

    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      lastName: booking.lastName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
    });

    const sent = await sendMessage(ownerPhone, message, booking.id);
    
    return {
      success: sent,
      message: sent ? "Booking confirmation notification sent to owner" : "Failed to send owner notification",
      metadata: { recipient: "owner", phone: ownerPhone },
    };
  }

  return { success: false, error: `Unsupported recipient for bookingConfirmation: ${recipient}` };
}

/**
 * Execute night before reminder
 * Phase 3.5: Implemented - sends reminder message to client or sitter the night before booking
 */
async function executeNightBeforeReminder(
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext,
  booking: any
): Promise<AutomationResult> {
  if (!booking) {
    return { success: false, error: "Booking required for nightBeforeReminder" };
  }

  // Skip if email is required but missing (for client reminders)
  if (recipient === "client" && !booking.email) {
    return {
      success: true,
      message: "Night before reminder skipped for client (no email)",
      metadata: { skipped: true, reason: "no_email" },
    };
  }

  let targetPhone: string | null = null;
  let template: string | null = null;
  let isSitterMessage = false;

  if (recipient === "client") {
    targetPhone = booking.phone;
    template = await getMessageTemplate("nightBeforeReminder", "client");
    if (!template || template.trim() === "") {
      template = "🌙 REMINDER!\n\nHi {{firstName}},\n\nJust a friendly reminder about your {{service}} appointment:\n{{datesTimes}}\n\nPets: {{petQuantities}}\n\nWe're excited to care for your pets!";
    }
  } else if (recipient === "sitter" && booking.sitterId) {
    targetPhone = await getSitterPhone(booking.sitterId, booking.id, "nightBeforeReminder");
    if (!targetPhone) {
      return { success: false, error: "Sitter phone not found for nightBeforeReminder" };
    }
    template = await getMessageTemplate("nightBeforeReminder", "sitter");
    if (!template || template.trim() === "") {
      template = "🌙 REMINDER!\n\nHi {{sitterFirstName}},\n\nYou have a {{service}} appointment:\n{{datesTimes}}\n\nClient: {{clientName}}\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nPlease confirm your availability.";
    }
    isSitterMessage = true;
  } else if (recipient === "owner") {
    // Owner reminders not typically sent for night before, but handle if needed
    targetPhone = await getOwnerPhone(booking.id, "nightBeforeReminder");
    if (!targetPhone) {
      return { success: false, error: "Owner phone not found for nightBeforeReminder" };
    }
    template = await getMessageTemplate("nightBeforeReminder", "owner");
    if (!template || template.trim() === "") {
      template = "🌙 REMINDER!\n\nReminder: {{clientName}} has a {{service}} appointment tomorrow:\n{{datesTimes}}\n\nPets: {{petQuantities}}";
    }
  } else {
    return { success: false, error: `Unsupported recipient or missing sitterId for nightBeforeReminder: ${recipient}` };
  }

  if (!targetPhone) {
    return { success: false, error: `No phone number found for ${recipient} for nightBeforeReminder` };
  }

  // Build template variables
  const petQuantities = formatPetsByQuantity(booking.pets);
  const formattedDatesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });

  let variables: Record<string, string | number> = {
    firstName: booking.firstName,
    lastName: booking.lastName,
    service: booking.service,
    datesTimes: formattedDatesTimes,
    date: formatDateForMessage(booking.startAt),
    time: formatTimeForMessage(booking.startAt),
    petQuantities,
  };

  if (isSitterMessage && booking.sitter) {
    const clientName = formatClientNameForSitter(booking.firstName, booking.lastName);
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
    const commissionPercentage = booking.sitter.commissionPercentage || 80.0;
    const earnings = (breakdown.total * commissionPercentage) / 100;
    
    variables = {
      ...variables,
      sitterFirstName: booking.sitter.firstName,
      clientName,
      address: booking.address || "TBD",
      earnings: earnings.toFixed(2),
      totalPrice: breakdown.total.toFixed(2),
      total: breakdown.total.toFixed(2),
    };
  } else if (recipient === "owner") {
    variables.clientName = `${booking.firstName} ${booking.lastName}`;
  }

  const message = replaceTemplateVariables(template, variables, { 
    isSitterMessage,
    sitterCommissionPercentage: booking.sitter?.commissionPercentage || context.sitter?.commissionPercentage,
  });

  // Phase 3: Client reminders use thread, owner/sitter use old method
  if (recipient === 'client') {
    const orgId = booking.orgId || 'default';
    const result = await sendAutomationMessageViaThread({
      bookingId: booking.id,
      orgId,
      clientId: booking.clientId || '',
      message,
      recipient: 'client',
      recipientPhone: targetPhone,
    });
    
    if (!result.success && result.usedThread === false) {
      // Thread not found - log audit warning
      // Note: eventLog model doesn't exist in enterprise-messaging-dashboard schema
      console.warn('[Automation] Thread not found, using fallback', {
        eventType: 'automation.fallback',
        status: 'warning',
        bookingId: booking.id,
        error: 'Thread not found, used fallback sendMessage',
        automationType: 'nightBeforeReminder',
        recipient: 'client',
        reason: 'Thread not found for booking',
      });
    }
    
    return {
      success: result.success,
      message: result.success ? `${recipient} reminder sent` : result.error || `Failed to send ${recipient} reminder`,
      metadata: { recipient, phone: targetPhone, bookingId: booking.id, usedThread: result.usedThread },
    };
  }
  
  // Owner/sitter reminders use old method
  const sent = await sendMessage(targetPhone, message, booking.id);
  
  return {
    success: sent,
    message: sent ? `${recipient} reminder sent` : `Failed to send ${recipient} reminder`,
    metadata: { recipient, phone: targetPhone, bookingId: booking.id },
  };
}

/**
 * Execute sitter assignment notification
 * Phase 3.4: Implemented - sends notification when sitter is assigned to booking
 */
async function executeSitterAssignment(
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext,
  booking: any
): Promise<AutomationResult> {
  if (!booking) {
    return { success: false, error: "Booking required for sitterAssignment" };
  }

  if (!booking.sitterId && !context.sitterId) {
    return { success: false, error: "Sitter ID required for sitterAssignment" };
  }

  const sitterId = booking.sitterId || context.sitterId;
  // Note: Sitter query disabled - booking model not available in messaging schema
  const sitter = booking.sitter || null;

  if (!sitter) {
    return { success: false, error: `Sitter not found: ${sitterId}` };
  }

  if (recipient === "sitter") {
    const sitterPhone = await getSitterPhone(sitterId);
    if (!sitterPhone) {
      return { success: false, error: "Sitter phone not found" };
    }

    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    const clientName = formatClientNameForSitter(booking.firstName, booking.lastName);

    let template = await getMessageTemplate("sitterAssignment", "sitter");
    if (!template || template.trim() === "") {
      template = "✅ NEW ASSIGNMENT!\n\nYou've been assigned to a {{service}} booking:\n\nClient: {{clientName}}\n{{datesTimes}}\n\nPets: {{petQuantities}}\n\nAddress: {{address}}";
    }

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

    const message = replaceTemplateVariables(template, {
      clientName,
      firstName: booking.firstName,
      lastName: booking.lastName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
      address: booking.address || "Address not provided",
      totalPrice: breakdown.total.toFixed(2),
      total: breakdown.total.toFixed(2),
      sitterName: `${sitter.firstName} ${sitter.lastName}`,
    }, {
      isSitterMessage: true,
      sitterCommissionPercentage: sitter.commissionPercentage || 80,
    });

    // Phase 3: Sitter notifications don't use thread (no booking context for sitter)
    // Keep old sendMessage for sitter notifications
    const sent = await sendMessage(sitterPhone, message, booking.id);
    
    return {
      success: sent,
      message: sent ? "Sitter assignment notification sent" : "Failed to send sitter notification",
      metadata: { recipient: "sitter", phone: sitterPhone, sitterId },
    };
  }

  if (recipient === "client") {
    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    let template = await getMessageTemplate("sitterAssignment", "client");
    if (!template || template.trim() === "") {
      template = "🐾 SITTER ASSIGNED!\n\nHi {{firstName}},\n\nYour sitter for {{service}} has been assigned:\n\nSitter: {{sitterName}}\n{{datesTimes}}\n\nPets: {{petQuantities}}\n\nWe'll see you soon!";
    }

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
      sitterName: `${sitter.firstName} ${sitter.lastName}`,
    });

    // Phase 3: Send via thread masking number
    const orgId = booking.orgId || 'default';
    const result = await sendAutomationMessageViaThread({
      bookingId: booking.id,
      orgId,
      clientId: booking.clientId || '',
      message,
      recipient: 'client',
      recipientPhone: booking.phone,
    });
    
    if (!result.success && result.usedThread === false) {
      // Thread not found - try to create it first, then send
      try {
        await onBookingConfirmed({
          bookingId: booking.id,
          orgId,
          clientId: booking.clientId || '',
          sitterId: booking.sitterId,
          startAt: new Date(booking.startAt),
          endAt: new Date(booking.endAt),
          actorUserId: 'system',
        });
        
        // Retry sending
        const retryResult = await sendAutomationMessageViaThread({
          bookingId: booking.id,
          orgId,
          clientId: booking.clientId || '',
          message,
          recipient: 'client',
          recipientPhone: booking.phone,
        });
        
        return {
          success: retryResult.success,
          message: retryResult.success ? "Sitter assignment notification sent to client" : retryResult.error || "Failed to send client notification",
          metadata: { recipient: "client", phone: booking.phone, usedThread: retryResult.usedThread },
        };
      } catch (error: any) {
        // Log audit warning
        // Note: eventLog model doesn't exist in enterprise-messaging-dashboard schema
        console.warn('[Automation] Thread creation failed', {
          eventType: 'automation.fallback',
          status: 'warning',
          bookingId: booking.id,
          error: `Thread creation failed: ${error.message}`,
          automationType: 'sitterAssignment',
          recipient: 'client',
          reason: 'Thread creation failed',
        });
      }
    }
    
    return {
      success: result.success,
      message: result.success ? "Sitter assignment notification sent to client" : result.error || "Failed to send client notification",
      metadata: { recipient: "client", phone: booking.phone, usedThread: result.usedThread },
    };
  }

  return { success: false, error: `Unsupported recipient for sitterAssignment: ${recipient}` };
}

/**
 * Execute payment reminder
 * Phase 3.4: Implemented - sends payment reminder message to client
 */
async function executePaymentReminder(
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext,
  booking: any
): Promise<AutomationResult> {
  if (!booking) {
    return { success: false, error: "Booking required for paymentReminder" };
  }

  if (recipient === "client") {
    // Skip if payment is already paid
    if (booking.paymentStatus === "paid") {
      return {
        success: true,
        message: "Payment reminder skipped - booking already paid",
        metadata: { skipped: true, reason: "already_paid" },
      };
    }

    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    let template = await getMessageTemplate("paymentReminder", "client");
    if (!template || template.trim() === "") {
      template = "💳 PAYMENT REMINDER\n\nHi {{firstName}},\n\nYour {{service}} booking is ready for payment.\n\n{{datesTimes}}\nPets: {{petQuantities}}\nTotal: ${{totalPrice}}\n\n{{paymentLink}}";
    }

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

    // Get payment link if available
    const paymentLink = booking.stripePaymentLinkUrl || "";

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
      totalPrice: breakdown.total.toFixed(2),
      total: breakdown.total.toFixed(2),
      paymentLink: paymentLink || "Payment link will be sent separately",
    });

    // Phase 3: Send via thread masking number
    const orgId = booking.orgId || 'default';
    const result = await sendAutomationMessageViaThread({
      bookingId: booking.id,
      orgId,
      clientId: booking.clientId || '',
      message,
      recipient: 'client',
      recipientPhone: booking.phone,
    });
    
    if (!result.success && result.usedThread === false) {
      // Thread not found - log audit warning
      // Note: eventLog model doesn't exist in enterprise-messaging-dashboard schema
      console.warn('[Automation] Thread not found, using fallback', {
        eventType: 'automation.fallback',
        status: 'warning',
        bookingId: booking.id,
        error: 'Thread not found, used fallback sendMessage',
        automationType: 'paymentReminder',
        recipient: 'client',
        reason: 'Thread not found for booking',
      });
    }
    
    return {
      success: result.success,
      message: result.success ? "Payment reminder sent to client" : result.error || "Failed to send payment reminder",
      metadata: { recipient: "client", phone: booking.phone, paymentLink: paymentLink || null, usedThread: result.usedThread },
    };
  }

  // Owner notifications for payment reminders are optional
  if (recipient === "owner") {
    const ownerPhone = await getOwnerPhone(booking.id, "paymentReminder");
    if (!ownerPhone) {
      return { success: false, error: "Owner phone not found" };
    }

    let template = await getMessageTemplate("paymentReminder", "owner");
    if (!template || template.trim() === "") {
      template = "💳 PAYMENT REMINDER\n\n{{firstName}} {{lastName}}'s {{service}} booking requires payment.\n\n{{datesTimes}}\nTotal: ${{totalPrice}}\nStatus: {{paymentStatus}}";
    }

    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

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

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      lastName: booking.lastName,
      service: booking.service,
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      totalPrice: breakdown.total.toFixed(2),
      total: breakdown.total.toFixed(2),
      paymentStatus: booking.paymentStatus || "unpaid",
    });

    const sent = await sendMessage(ownerPhone, message, booking.id);
    
    return {
      success: sent,
      message: sent ? "Payment reminder notification sent to owner" : "Failed to send owner notification",
      metadata: { recipient: "owner", phone: ownerPhone },
    };
  }

  return { success: false, error: `Unsupported recipient for paymentReminder: ${recipient}` };
}

/**
 * Execute post visit thank you
 * Phase 3.4: Implemented - sends thank you message after visit completion
 */
async function executePostVisitThankYou(
  recipient: "client" | "sitter" | "owner",
  context: AutomationContext,
  booking: any
): Promise<AutomationResult> {
  if (!booking) {
    return { success: false, error: "Booking required for postVisitThankYou" };
  }

  // Only send to completed bookings
  if (booking.status !== "completed") {
    return {
      success: true,
      message: "Post visit thank you skipped - booking not completed",
      metadata: { skipped: true, reason: "not_completed", status: booking.status },
    };
  }

  if (recipient === "client") {
    const petQuantities = formatPetsByQuantity(booking.pets);
    const formattedDatesTimes = formatDatesAndTimesForMessage({
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      timeSlots: booking.timeSlots || [],
    });

    let template = await getMessageTemplate("postVisitThankYou", "client");
    if (!template || template.trim() === "") {
      template = "🐾 THANK YOU!\n\nHi {{firstName}},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their {{service}}.\n\n{{datesTimes}}\nPets: {{petQuantities}}\n\nWe look forward to caring for your pets again soon!";
    }

    const message = replaceTemplateVariables(template, {
      firstName: booking.firstName,
      service: booking.service.toLowerCase(),
      datesTimes: formattedDatesTimes,
      date: formatDateForMessage(booking.startAt),
      time: formatTimeForMessage(booking.startAt),
      petQuantities,
      sitterName: booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : "your assigned sitter",
    });

    // Phase 3: Send via thread masking number
    const orgId = booking.orgId || 'default';
    const result = await sendAutomationMessageViaThread({
      bookingId: booking.id,
      orgId,
      clientId: booking.clientId || '',
      message,
      recipient: 'client',
      recipientPhone: booking.phone,
    });
    
    if (!result.success && result.usedThread === false) {
      // Thread not found - log audit warning
      // Note: eventLog model doesn't exist in enterprise-messaging-dashboard schema
      console.warn('[Automation] Thread not found, using fallback', {
        eventType: 'automation.fallback',
        status: 'warning',
        bookingId: booking.id,
        error: 'Thread not found, used fallback sendMessage',
        automationType: 'postVisitThankYou',
        recipient: 'client',
        reason: 'Thread not found for booking',
      });
    }
    
    return {
      success: result.success,
      message: result.success ? "Post visit thank you sent to client" : result.error || "Failed to send post visit thank you",
      metadata: { recipient: "client", phone: booking.phone, usedThread: result.usedThread },
    };
  }

  // Sitter thank you (optional)
  if (recipient === "sitter" && booking.sitterId) {
    const sitterPhone = await getSitterPhone(booking.sitterId, booking.id, "postVisitThankYou");
    if (!sitterPhone) {
      return { success: false, error: "Sitter phone not found for postVisitThankYou" };
    }

    const clientName = formatClientNameForSitter(booking.firstName, booking.lastName);
    const petQuantities = formatPetsByQuantity(booking.pets);

    let template = await getMessageTemplate("postVisitThankYou", "sitter");
    if (!template || template.trim() === "") {
      template = "🐾 GREAT JOB!\n\nHi,\n\nThank you for completing {{clientName}}'s {{service}} visit!\n\nPets: {{petQuantities}}\n\nYour professionalism makes all the difference!";
    }

    const message = replaceTemplateVariables(template, {
      clientName,
      service: booking.service.toLowerCase(),
      petQuantities,
    });

    const sent = await sendMessage(sitterPhone, message, booking.id);
    
    return {
      success: sent,
      message: sent ? "Post visit thank you sent to sitter" : "Failed to send sitter thank you",
      metadata: { recipient: "sitter", phone: sitterPhone, sitterId: booking.sitterId },
    };
  }

  // Owner notifications for post visit are typically not needed
  if (recipient === "owner") {
    return {
      success: true,
      message: "Post visit thank you skipped for owner (typically not needed)",
      metadata: { skipped: true, reason: "owner_not_needed" },
    };
  }

  return { success: false, error: `Unsupported recipient for postVisitThankYou: ${recipient}` };
}
