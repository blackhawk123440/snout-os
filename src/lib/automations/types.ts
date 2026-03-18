/**
 * Canonical automation settings shape.
 * Stored per-org in Setting table with key AUTOMATION_SETTINGS_KEY.
 * Used by executor (getAutomationSettings / getMessageTemplate) and /api/automations.
 */

export const AUTOMATION_SETTINGS_KEY = "automation";

export type AutomationTypeId =
  | "bookingConfirmation"
  | "nightBeforeReminder"
  | "paymentReminder"
  | "sitterAssignment"
  | "postVisitThankYou"
  | "ownerNewBookingAlert";

export interface AutomationSettings {
  bookingConfirmation: {
    enabled: boolean;
    sendToClient: boolean;
    sendToSitter: boolean;
    sendToOwner: boolean;
    messageTemplateClient?: string;
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  nightBeforeReminder: {
    enabled: boolean;
    sendToClient: boolean;
    sendToSitter: boolean;
    reminderTime: string;
    messageTemplateClient?: string;
    messageTemplateSitter?: string;
  };
  paymentReminder: {
    enabled: boolean;
    sendToClient: boolean;
    reminderDelay: number;
    repeatReminder: boolean;
    repeatInterval: number;
    messageTemplateClient?: string;
  };
  sitterAssignment: {
    enabled: boolean;
    sendToSitter: boolean;
    sendToOwner: boolean;
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  postVisitThankYou: {
    enabled: boolean;
    sendToClient: boolean;
    delayAfterVisit: number;
    messageTemplateClient?: string;
  };
  ownerNewBookingAlert: {
    enabled: boolean;
    sendToOwner: boolean;
    sendToClient?: boolean;
    ownerPhoneType: "personal" | "messaging";
    messageTemplateClient?: string;
    messageTemplateOwner?: string;
  };
}

/** Default: all automations enabled — zero manual ops from day one. */
export function getDefaultAutomationSettings(): AutomationSettings {
  return {
    bookingConfirmation: {
      enabled: true,
      sendToClient: true,
      sendToSitter: false,
      sendToOwner: false,
    },
    nightBeforeReminder: {
      enabled: true,
      sendToClient: true,
      sendToSitter: true,
      reminderTime: "19:00",
    },
    paymentReminder: {
      enabled: true,
      sendToClient: true,
      reminderDelay: 24,
      repeatReminder: true,
      repeatInterval: 7,
    },
    sitterAssignment: {
      enabled: true,
      sendToSitter: true,
      sendToOwner: true,
    },
    postVisitThankYou: {
      enabled: true,
      sendToClient: true,
      delayAfterVisit: 30,
    },
    ownerNewBookingAlert: {
      enabled: true,
      sendToOwner: true,
      sendToClient: false,
      ownerPhoneType: "messaging",
    },
  };
}

export const AUTOMATION_TYPE_IDS: AutomationTypeId[] = [
  "bookingConfirmation",
  "nightBeforeReminder",
  "paymentReminder",
  "sitterAssignment",
  "postVisitThankYou",
  "ownerNewBookingAlert",
];
